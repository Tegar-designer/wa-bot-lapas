const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const menus = require('./menus');

// Menyimpan "state" percakapan tiap nomor (in-memory).
const sesi = new Map();

function getSesi(jid) {
  if (!sesi.has(jid)) {
    sesi.set(jid, { mode: 'menu', sudahDisapa: false, sudahDiingatkan: false });
  }
  return sesi.get(jid);
}

// --- PENTING: interval & flag ditaruh di scope MODUL (bukan di dalam startBot) ---
// Ini mencegah "interval hantu" dari socket lama yang masih jalan
// setelah startBot() dipanggil ulang saat reconnect.
let refreshInterval = null;
let countdownInterval = null;
let isStarting = false; // guard supaya tidak ada 2 proses startBot() bersamaan

function bersihkanSemuaInterval() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

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

async function startBot() {
  // Guard: kalau masih ada proses startBot() lain yang jalan, jangan mulai lagi
  if (isStarting) {
    console.log('⚠️  startBot() masih berjalan, lewati pemanggilan duplikat.');
    return;
  }
  isStarting = true;

  // Bersihkan semua interval dari percobaan sebelumnya sebelum mulai yang baru
  bersihkanSemuaInterval();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  let nomorWA = process.env.WA_NUMBER || '6285760608695';

  if (!state.creds.registered) {
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
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  let sudahMintaCode = false;

  async function mintaPairingCode() {
    // Jangan minta kode baru kalau socket sudah tidak siap / sudah registered
    if (state.creds.registered) return;
    try {
      console.log('Nomor WA:', nomorWA);
      console.log('Registered:', state.creds.registered);

      const code = await sock.requestPairingCode(nomorWA);
      const formatCode = code.match(/.{1,4}/g)?.join('-') || code;
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.log(`\n🔑 Pairing Code: *${formatCode}*`);
      console.log('👉 WhatsApp → Perangkat Tertaut → Tautkan Perangkat');
      console.log('   → Tautkan dengan Nomor Telepon → masukkan kode di atas\n');
      mulaiCountdown(55);
    } catch (err) {
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.warn('⚠️  Gagal minta kode:', err.message);
      // JANGAN retry otomatis di sini kalau socket sudah closed —
      // biarkan event 'connection.update' yang menangani reconnect.
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (!state.creds.registered && nomorWA && !sudahMintaCode) {
      sudahMintaCode = true;
      await new Promise((r) => setTimeout(r, 10000));
      await mintaPairingCode();

      refreshInterval = setInterval(async () => {
        if (!state.creds.registered) {
          await mintaPairingCode();
        } else {
          bersihkanSemuaInterval();
        }
      }, 55000);
    }

    if (connection === 'close') {
      bersihkanSemuaInterval(); // stop semua interval milik socket ini
      isStarting = false;

      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `Koneksi terputus. Status: ${statusCode} (${DisconnectReason[statusCode] || 'unknown'}). Reconnect: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Beri jeda sebelum reconnect supaya tidak spam request ke WhatsApp
        // (spam request pairing dalam waktu singkat bisa memicu 401 loggedOut)
        setTimeout(() => startBot(), 3000);
      } else {
        console.log(
          '❌ Sesi logout / kredensial tidak valid. Hapus folder "auth_info" lalu jalankan ulang.'
        );
      }
    } else if (connection === 'open') {
      bersihkanSemuaInterval();
      isStarting = false;
      process.stdout.write('\r' + ' '.repeat(50) + '\r');
      console.log('✅ Bot berhasil terhubung ke WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.message?.protocolMessage) return;
    if (msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (jid.endsWith('@g.us')) return;

    try {
      const teks = ambilTeksPesan(msg).trim();
      const teksLower = teks.toLowerCase();
      const data = getSesi(jid);

      if (!data.sudahDisapa) {
        data.sudahDisapa = true;
        await kirimTeks(sock, jid, menus.pembuka());
        return;
      }

      if (data.mode === 'tanya_lainnya') {
        if (['selesai', 'terima kasih', 'makasih'].includes(teksLower)) {
          data.mode = 'menu';
          data.sudahDiingatkan = false;
          await kirimTeks(sock, jid, menus.penutup());
          return;
        }
        if (teksLower === '0' || teksLower === 'menu') {
          data.mode = 'menu';
          data.sudahDiingatkan = false;
          await kirimTeks(sock, jid, menus.pembuka());
          return;
        }
        data.mode = 'menu';
        data.sudahDiingatkan = false;
        await kirimTeks(
          sock,
          jid,
          `✅ Pertanyaan Anda sudah kami terima.\nAkan dijawab petugas pada jam kerja. 🙏`
        );
        await new Promise((r) => setTimeout(r, 1000));
        await kirimTeks(sock, jid, menus.pembuka());
        return;
      }

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
          if (!data.sudahDiingatkan) {
            data.sudahDiingatkan = true;
            await kirimTeks(sock, jid, menus.tidakDikenali());
          }
          break;
      }
    } catch (err) {
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