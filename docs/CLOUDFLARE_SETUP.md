# Cloudflare deployment — webUMKM

Dokumen ini adalah checklist deployment pertama untuk `umkmjaya/webUMKM`.

## 1. Buat D1

Di Cloudflare, buat database D1 dengan nama:

`webumkm`

Atau dari terminal:

```bash
npx wrangler d1 create webumkm
```

Perintah tersebut menghasilkan `database_id`. Cloudflare mendokumentasikan bahwa `d1 create` membuat database remote dan memberikan UUID yang dipakai pada konfigurasi. 

Setelah database dibuat, isi `database_id` pada `wrangler.toml`.

## 2. Isi database

Untuk database baru, gunakan bootstrap satu kali:

```bash
npx wrangler d1 execute webumkm --remote --file=database/bootstrap.sql
```

`database/bootstrap.sql` sudah berisi struktur final aplikasi, index, dan seed template/package. File migration lama tetap disimpan sebagai histori perubahan.

## 3. Buat R2

Buat bucket R2:

`webumkm-media`

Lalu bind bucket tersebut ke Pages dengan variable name:

`BUCKET`

Cloudflare Pages Functions dapat memakai binding D1 dan R2 melalui `context.env`; binding dapat dikonfigurasi dari dashboard atau Wrangler. Setelah binding diubah, lakukan redeploy. 

## 4. Hubungkan GitHub ke Pages

Buat project Pages dari repository:

`umkmjaya/webUMKM`

Branch production:

`main`

Repository ini menggunakan folder `functions/` untuk Pages Functions, sehingga jangan menghapus folder tersebut. Cloudflare Pages mendukung deployment Functions melalui koneksi Git provider atau Wrangler; Direct Upload dashboard tidak mendukung Functions. 

## 5. Binding D1

Pada Pages project:

`Settings → Bindings → Add → D1 database`

Gunakan:

- Variable name: `DB`
- Database: `webumkm`

## 6. Binding R2

Pada Pages project:

`Settings → Bindings → Add → R2 bucket`

Gunakan:

- Variable name: `BUCKET`
- Bucket: `webumkm-media`

## 7. Secrets / environment variables

Tambahkan pada Production:

- `MIDTRANS_SERVER_KEY` = server key Midtrans
- `MIDTRANS_IS_PRODUCTION` = `false` untuk tahap Sandbox
- `PAYMENT_FINISH_URL` = URL halaman selesai pembayaran, misalnya `/admin/`

Jangan commit server key ke GitHub.

Cloudflare menyediakan environment variables/secrets melalui `Settings → Variables and Secrets`. 

## 8. Redeploy

Setelah D1, R2, dan secrets selesai, lakukan redeploy project Pages. Binding baru tersedia pada deployment setelah konfigurasi diterapkan.

## 9. Test MVP

Urutan test:

1. Buka `/admin/register.html`.
2. Daftar akun.
3. Login.
4. Buat website baru.
5. Pilih Template #1 atau #2.
6. Upload logo/hero/product image.
7. Simpan draft.
8. Klik `Order & Bayar`.
9. Pastikan order dibuat.
10. Lakukan pembayaran Midtrans Sandbox.
11. Pastikan webhook mengubah order menjadi paid dan website menjadi active.
12. Buka preview/public site.
13. Buat akun kedua dan gunakan referral code akun pertama.
14. Setelah pembayaran berhasil, pastikan reward referral menjadi Rp25.000.

## Catatan penting

`wrangler.toml` saat ini masih memakai placeholder `ISI_DATABASE_ID_CLOUDFLARE`. Jangan deploy konfigurasi tersebut untuk production sebelum diganti dengan database ID D1 yang sebenarnya.

Cloudflare menyatakan D1/R2 binding dapat dikonfigurasi di dashboard maupun Wrangler. Untuk proyek Pages yang sudah dibuat, gunakan konfigurasi dashboard sebagai cara paling sederhana pada tahap pertama. 
