const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');
const menus = require('./menus');


// Menyimpan "state" percakapan tiap nomor (in-memory).
// key: nomor pengirim, value: { mode: 'menu' | 'tanya_lainnya' }
const sesi = new Map();

function getSesi(jid) {
  if (!sesi.has(jid)) {
    sesi.set(jid, { mode: 'menu', sudahDisapa: false, sudahDiingatkan: false });
  }
  return sesi.get(jid);
}

// Baca input dari terminal
function tanyaInput(pertanyaan) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pertanyaan, (jawaban) => {
      rl.close();
      resolve(jawaban.trim());
    });
  });
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  // Tanya nomor dulu sebelum koneksi, hanya jika belum terdaftar
  let nomorWA = '';
  if (!state.creds.registered) {
    nomorWA = await tanyaInput(
      '\n📱 Masukkan nomor WhatsApp Anda (format internasional, tanpa + dan spasi)\n   Contoh: 6281234567890\n➜ '
    );
    nomorWA = nomorWA.replace(/[^0-9]/g, '');
    console.log(`\n⏳ Menghubungkan ke WhatsApp untuk nomor: ${nomorWA} ...\n`);
  }

 const sock = makeWASocket({
  version,
  auth: state,
  logger: pino({ level: 'silent' }),
  browser: ['Ubuntu', 'Chrome', '22.04'],
  printQRInTerminal: false,
  markOnlineOnConnect: false,
  syncFullHistory: false
});

  sock.ev.on('creds.update', saveCreds);

  let sudahMintaCode = false;
  let refreshInterval = null;   // untuk auto-refresh kode
  let countdownInterval = null; // untuk hitungan mundur

  // Fungsi tampilkan countdown di satu baris (overwrite)
  function mulaiCountdown(detik) {
    if (countdownInterval) clearInterval(countdownInterval);
    let sisa = detik;
    process.stdout.write(`   ⏱  Kode baru dalam: ${sisa} detik`);
    countdownInterval = setInterval(() => {
      sisa--;
      process.stdout.write(`\r   ⏱  Kode baru dalam: ${sisa} detik  `);
      if (sisa <= 0) clearInterval(countdownInterval);
    }, 1000);
  }

  // Fungsi minta & tampilkan pairing code, lalu mulai countdown
  async function mintaPairingCode() {
    try {
      console.log('Nomor WA:', nomorWA);
console.log('Registered:', state.creds.registered);

      const code = await sock.requestPairingCode(nomorWA);
      const formatCode = code.match(/.{1,4}/g)?.join('-') || code;
      // Bersihkan baris countdown sebelumnya
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.log(`\n🔑 Pairing Code: *${formatCode}*`);
      console.log('👉 WhatsApp → Perangkat Tertaut → Tautkan Perangkat');
      console.log('   → Tautkan dengan Nomor Telepon → masukkan kode di atas\n');
      mulaiCountdown(55);
    } catch (err) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.warn('⚠️  Gagal refresh kode:', err.message, '— mencoba lagi...');
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    // Minta pairing code saat pertama kali, lalu auto-refresh setiap 55 detik
    if (!state.creds.registered && nomorWA && !sudahMintaCode) {
      sudahMintaCode = true;
      // Tunggu sebentar agar handshake selesai
      await new Promise((r) => setTimeout(r, 10000));
      await mintaPairingCode();
      // Auto-refresh kode setiap 55 detik supaya tidak expired
      refreshInterval = setInterval(async () => {
        if (!state.creds.registered){
          await mintaPairingCode();
        } else {
          // Sudah login, hentikan refresh
          clearInterval(refreshInterval);
          clearInterval(countdownInterval);
        }
      }, 55000);
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `Koneksi terputus. Status: ${statusCode} (${DisconnectReason[statusCode] || 'unknown'}). Reconnect: ${shouldReconnect}`
      );
      if (shouldReconnect) {
        startBot();
      } else {
        console.log(
          '❌ Sesi logout / kredensial tidak valid. Hapus folder "auth_info" lalu jalankan ulang.'
        );
      }
    } else if (connection === 'open') {
      // Berhasil login, hentikan semua interval
      if (refreshInterval) clearInterval(refreshInterval);
      if (countdownInterval) clearInterval(countdownInterval);
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.log('✅ Bot berhasil terhubung ke WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];

    // Abaikan pesan yang gagal didekripsi (MessageCounterError, dll)
    if (!msg.message || msg.message?.protocolMessage) return;
    if (msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (jid.endsWith('@g.us')) return; // abaikan pesan dari grup

    try {
      const teks = ambilTeksPesan(msg).trim();
      const teksLower = teks.toLowerCase();

      const data = getSesi(jid);

    // Pesan pertama dari kontak ini -> langsung tampilkan menu, abaikan isi pesannya
    if (!data.sudahDisapa) {
      data.sudahDisapa = true;
      await kirimTeks(sock, jid, menus.pembuka());
      return;
    }

    // Mode "Layanan Informasi Lainnya": tangkap pertanyaan bebas
    if (data.mode === 'tanya_lainnya') {
      // Kalau user mau keluar / ucapkan terima kasih -> tampilkan penutup
      if (['selesai', 'terima kasih', 'makasih'].includes(teksLower)) {
        data.mode = 'menu';
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.penutup());
        return;
      }
      // Kalau user minta menu -> tampilkan menu
      if (teksLower === '0' || teksLower === 'menu') {
        data.mode = 'menu';
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.pembuka());
        return;
      }
      // Pertanyaan bebas: konfirmasi diterima, lalu LANGSUNG tampilkan menu lagi
      // (tidak perlu ketik 0, tidak spam)
      data.mode = 'menu';
      data.sudahDiingatkan = false;
      await kirimTeks(
        sock,
        jid,
        `✅ Pertanyaan Anda sudah kami terima.\nAkan dijawab petugas pada jam kerja. 🙏`
      );
      // Jeda sebentar agar dua pesan tidak terasa bersamaan
      await new Promise((r) => setTimeout(r, 1000));
      await kirimTeks(sock, jid, menus.pembuka());
      return;
    }

    // Mode menu utama
    switch (teksLower) {
      case '1':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.menu1());
        break;
      case '2':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.menu2());
        break;
      case '3':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.menu3());
        break;
      case '4':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.menu4());
        break;
      case '5':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.menu5());
        break;
      case '6':
        data.sudahDiingatkan = false;
        data.mode = 'tanya_lainnya';
        await kirimTeks(sock, jid, menus.menu6());
        break;
      case '0':
      case 'menu':
      case 'halo':
      case 'hai':
      case 'hi':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.pembuka());
        break;
      case 'selesai':
      case 'terima kasih':
      case 'makasih':
        data.sudahDiingatkan = false;
        await kirimTeks(sock, jid, menus.penutup());
        break;
      default:
        // Pesan tidak dikenali: hanya diingatkan SEKALI, setelah itu bot diam
        // supaya tidak spam balasan saat orang chat normal / bukan untuk bot.
        if (!data.sudahDiingatkan) {
          data.sudahDiingatkan = true;
          await kirimTeks(sock, jid, menus.tidakDikenali());
        }
        // Kalau sudah pernah diingatkan, bot tidak membalas apa-apa (diam).
        break;
    }
    } catch (err) {
      // Tangkap error decrypt / session agar bot tidak crash
      console.warn(`⚠️ Error saat memproses pesan dari ${jid}:`, err.message);
    }
  });
}

function ambilTeksPesan(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}


async function kirimTeks(sock, jid, teks) {
  await sock.sendMessage(jid, { text: teks });
}

startBot();