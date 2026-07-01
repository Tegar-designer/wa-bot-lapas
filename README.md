# Bot WhatsApp Layanan Kunjungan Lapas Kelas IIA Kotabumi

Bot WhatsApp sederhana berbasis menu, dibuat dengan library **Baileys**
(`@whiskeysockets/baileys`), berdasarkan alur chatbot di dokumen
"CHATBOT LAYANAN KUNJUNGAN".

## Fitur / Menu
1. Informasi Kunjungan
2. Syarat & Ketentuan
3. Jadwal Layanan
4. Alur Kunjungan
5. Barang yang boleh dan tidak dibawa
6. Layanan Informasi Lainnya (pertanyaan bebas, otomatis diteruskan ke petugas)
- Sapaan pembuka otomatis untuk kontak baru
- Penutup ("selesai" / "terima kasih")
- Ketik **0** atau **menu** kapan saja untuk kembali ke menu utama

## Persyaratan
- Node.js versi 18 ke atas
- Nomor WhatsApp aktif (sebaiknya nomor khusus untuk bot, bukan nomor pribadi)

## Instalasi
```bash
cd bot-kunjungan-lapas
npm install
```

## Menjalankan Bot
```bash
npm start
```

Saat pertama kali dijalankan, akan muncul **QR Code** di terminal.
Scan QR tersebut menggunakan WhatsApp di HP Anda:
WhatsApp > Perangkat Tertaut > Tautkan Perangkat.

Setelah berhasil, sesi login akan disimpan otomatis di folder `auth_info/`,
jadi tidak perlu scan ulang setiap kali bot dijalankan (kecuali logout).

## Struktur File
```
bot-kunjungan-lapas/
├── index.js       # Logic utama bot (koneksi & alur percakapan)
├── menus.js        # Semua teks/isi menu, gampang diedit
├── package.json
└── auth_info/      # Folder sesi login (otomatis dibuat saat jalan pertama kali)
```

## Mengedit Isi Menu
Semua teks balasan ada di file `menus.js`. Tinggal ubah teks di dalam
fungsi-fungsi seperti `menu1()`, `menu2()`, dst tanpa perlu mengubah `index.js`.

## Catatan Penting
- Library Baileys memakai WhatsApp Web protocol (tidak resmi/unofficial),
  jadi ada risiko pemblokiran nomor jika dipakai untuk spam/broadcast massal.
  Gunakan secukupnya sesuai kebutuhan layanan informasi.
- Untuk skala produksi/instansi, sebaiknya:
  - Gunakan nomor WhatsApp Business khusus
  - Tambahkan database (mis. SQLite/PostgreSQL) untuk menyimpan sesi & log pertanyaan dari menu 6
  - Hubungkan menu 6 ke sistem tiket/CS petugas (misal grup WA internal, atau Telegram bot petugas)
- Saat ini state percakapan disimpan di memori (akan hilang jika bot di-restart). Untuk produksi sebaiknya gunakan penyimpanan persisten.