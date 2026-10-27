This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Penomoran otomatis dari Google Drive

Nomor Laporan Harian Intelijen (`R/LHI/{urutan}/{bulan romawi}/REN.4.1.1./{tahun}/Intelkam`)
diambil dari **nomor terakhir yang tertulis di berkas laporan di Google Drive + 1**.
Urutan lanjut sepanjang tahun (298 → 299 → …), bulan romawi mengikuti tanggal laporan,
dan tahun baru mulai dari 1. Kode: `lib/googleDrive.ts`, `lib/nomorLaporan.ts`.

Cara kerja: folder Drive dipindai (termasuk subfolder, maks. 2 tingkat), 12 berkas terbaru
dibaca (Google Docs, `.docx`, atau teks), lalu nomor `R/LHI/…` terbesar untuk tahun tersebut dicari
di nama dan isi berkas. PDF tidak dibaca.

### Setup (sekali saja)

1. [Google Cloud Console](https://console.cloud.google.com) → buat/pilih project → **APIs & Services → Library → Google Drive API → Enable**.
2. **IAM & Admin → Service Accounts → Create** → buka akun itu → **Keys → Add key → JSON** (file terunduh).
3. Di Google Drive, **bagikan folder laporan ke `client_email` service account** (isi file JSON) sebagai **Viewer**.
4. Isi env (di `.env.local` dan di Vercel → Settings → Environment Variables):

   | Env | Isi |
   |---|---|
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | isi file JSON mentah, **atau** hasil `base64 -i kunci.json` (disarankan untuk Vercel) |
   | `GOOGLE_DRIVE_FOLDER_ID` | ID folder (bagian akhir URL `drive.google.com/drive/folders/<ID>`) |
   | `GOOGLE_DRIVE_FOLDER_ID_LHI` | opsional — kalau folder LHI berbeda dari folder default |

5. Restart server (atau redeploy di Vercel). Cek cepat: buka `/api/drive-status` di browser — `terhubung: true` berarti beres,
   `terhubung: false` disertai `alasan`. Di preview Laporan Harian Intelijen akan muncul "✓ Nomor otomatis dari Google Drive".
   Jika Drive belum terhubung/gagal dibaca, muncul peringatan oranye "Nomor perkiraan" beserta alasannya.

Catatan: nomor dihitung dari apa yang **sudah ada di Drive**. Dua laporan yang dibuat berurutan
sebelum yang pertama diunggah ke Drive akan mendapat nomor yang sama.
