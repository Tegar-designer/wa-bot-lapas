function pembuka() {
  return (
`👋 Halo, selamat datang di Layanan Kunjungan Lapas Kelas IIA Kotabumi
Kami siap membantu Anda mendapatkan informasi kunjungan dengan cepat dan mudah 😊

Silakan pilih menu berikut:
1️⃣ Informasi Kunjungan
2️⃣ Syarat & Ketentuan
3️⃣ Jadwal Layanan
4️⃣ Alur Kunjungan
5️⃣ Barang yang boleh dan tidak dibawa
6️⃣ Layanan Informasi Lainnya

Ketik angka pilihan Anda ya.`
  );
}

function menu1() {
  return (
`📌 *Informasi Kunjungan*

Layanan kunjungan merupakan sarana bagi keluarga dan kerabat untuk bertemu langsung dengan warga binaan dalam suasana yang tertib, aman, dan nyaman.

Kami berkomitmen memberikan pelayanan yang ramah, transparan, dan sesuai aturan yang berlaku.

Durasi kunjungan akan menyesuaikan dengan kebijakan lapas.

Ketik *0* untuk kembali ke menu utama.`
  );
}

function menu2() {
  return (
`✔ *Syarat & Ketentuan*

✔ Membawa identitas
Identitas yang dapat digunakan meliputi:
1. KTP
2. SIM
3. Kartu Keluarga (KK)
4. Kartu Identitas Anak (KIA)
5. Kartu pelajar/mahasiswa
6. Surat domisili dari kelurahan/desa

✔ Berpakaian rapi dan sopan
✔ Wajib mengikuti pemeriksaan petugas

Ketik *0* untuk kembali ke menu utama.`
  );
}

function menu3() {
  return (
`🗓 *Jadwal Layanan*

🗓 Senin – Sabtu
⏰ 09.00 – 11.30

📝 Catatan:
- Hari Jumat hanya ada penitipan barang
- Hari Sabtu khusus luar kota
- Tanggal merah libur

_Jadwal dapat berubah sesuai kebijakan._

Ketik *0* untuk kembali ke menu utama.`
  );
}

function menu4() {
  return (
`🚶 *Alur Kunjungan*

1. Datang sesuai jadwal
2. Daftar di loket
3. Menunggu panggilan
4. Pemeriksaan barang & badan
5. Kunjungan
6. Selesai

Ketik *0* untuk kembali ke menu utama.`
  );
}

function menu5() {
  return (
`🎒 *Barang yang Boleh dan Tidak Dibawa*

━━━━━━━━━━━━━━━━━━━━
❌ *BARANG DILARANG MASUK*
━━━━━━━━━━━━━━━━━━━━
_Berdasarkan Permenkumham No. 8 Tahun 2024 Pasal 26_

1. Narkoba, obat terlarang & zat adiktif lainnya
2. Minuman beralkohol
3. Alat komunikasi dan elektronik
4. Bahan makanan mentah dan/atau benih tanaman
5. Senjata api, senjata tajam, atau benda sejenisnya
6. Barang yang dapat menimbulkan kebakaran & ledakan
7. Perkakas dan alat masak
8. Minuman dalam kemasan kaleng atau kaca
9. Barang yang dapat menimbulkan lilitan/ikatan
10. Bahan berbahaya
11. Bumbu makanan

━━━━━━━━━━━━━━━━━━━━
✅ *BARANG DIPERBOLEHKAN MASUK*
━━━━━━━━━━━━━━━━━━━━
_Berdasarkan Permenkumham No. 8 Tahun 2024 Pasal 27_

1. 👕 Pakaian maksimal 3 pasang:
   - Baju ibadah
   - Kemeja putih, merah, dan biru
   - Celana panjang warna gelap

2. 🍱 Makanan olahan siap saji maks. 2 bungkus:
   - Makanan olahan rumahan
   - Nasi bungkus sebanyak 2 bungkus

3. 💊 Obat-obatan (setelah dikoordinasikan dengan pihak medis Lapas)

4. 💵 Uang tunai maksimal Rp1.000.000,- (satu juta rupiah)

Ketik *0* untuk kembali ke menu utama.`
  );
}

function menu6() {
  return (
`💬 *Layanan Informasi Lainnya*

Silakan ketik pertanyaan yang ingin Anda sampaikan.
Apabila memerlukan bantuan petugas, pertanyaan akan dijawab di jam kerja. 🙏

Ketik *0* untuk kembali ke menu utama.`
  );
}

function penutup() {
  return (
`🙏 *Terima kasih telah menggunakan layanan kami.*

Kami berharap informasi ini membantu dan memudahkan kunjungan Anda.

Jika masih ada pertanyaan, silakan pilih menu kembali dengan mengetik *0*.

Selamat melanjutkan aktivitas Anda 😊`
  );
}

function tidakDikenali() {
  return (
`Maaf, pilihan tidak dikenali 🙏
Ketik *0* atau *menu* untuk melihat pilihan menu kembali.`
  );
}

module.exports = {
  pembuka,
  menu1,
  menu2,
  menu3,
  menu4,
  menu5,
  menu6,
  penutup,
  tidakDikenali,
};