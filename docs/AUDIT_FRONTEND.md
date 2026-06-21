# Audit Frontend Twistgram — 21 Juni 2026

## Ringkasan Eksekutif

- Total temuan: **Kritis (5), Sedang (32), Rendah (9), Sekadar Catatan (7)**.
- Total temuan per kategori: **A (15), B (4), C (6), D (10), E (10), F (8)**.
- Kondisi umum: UI demo sudah mencakup mayoritas layar Fase 0–7, tetapi belum dapat dinyatakan siap mengganti mock dengan backend Go. Hambatan utama adalah pemanggilan langsung ke `services/mock/*`, pengelolaan token/sesi API yang belum tersambung, beberapa flow MVP yang hanya bersifat visual, dan kontrak body/response API yang belum didefinisikan rinci.
- Verifikasi teknis:
  - `npx tsc --noEmit`: **lulus** tanpa error.
  - `npm run lint`: **gagal dijalankan dengan konfigurasi default** karena ESLint 9 tidak membaca `.eslintrc.json`.
  - Lint dengan mode konfigurasi legacy: **57 masalah (41 error, 16 warning)**.
  - Vite dev server: **berhasil merespons HTTP 200**.
  - Console browser tidak dapat diinspeksi penuh tanpa browser automation; audit menemukan **17 pemanggilan `console.*`** secara statis.
  - Worktree bersih sebelum laporan ini dibuat; tidak ada source code yang diubah.

### Rekomendasi urutan prioritas sebelum integrasi backend

1. Putus seluruh ketergantungan UI terhadap `services/mock/*`; jadikan `src/services/index.ts` satu-satunya entrypoint data.
2. Benahi lifecycle autentikasi API: penyimpanan access/refresh token, hydration user, refresh token, logout, dan format response.
3. Tetapkan kontrak request/response backend yang eksplisit, termasuk casing field, pagination, error envelope, upload media, serta endpoint helper yang saat ini tidak ada di SRS.
4. Selesaikan flow MVP yang saat ini palsu/belum lengkap: story reply ke DM, mulai percakapan, like komentar, tag/mention, share ke DM, unblock, report post/comment, dan recovery email.
5. Satukan model data/type dan mock store agar registrasi, profil, feed, notifikasi, dan relasi sosial memakai sumber data yang sama.
6. Pulihkan quality gate: migrasi konfigurasi ESLint, selesaikan lint errors, dan tambahkan test untuk business rule serta empat regression bug.
7. Rapikan README, showcase sementara, struktur folder, dan dokumentasi agar status project tidak menyesatkan proses integrasi backend.

---

## A. Kesesuaian Implementasi vs Roadmap Fase 0–7

| Lokasi | Temuan | Urgensi | Rekomendasi |
|---|---|---:|---|
| `src/pages/CreatePostPage.tsx`, `src/services/mock/post.ts`, `src/types/index.ts` | MVP tag pengguna pada post belum tersedia. Tidak ada input tagged user, model `PostTag`, pemanggilan notifikasi mention, atau hak pengguna untuk menghapus tag sesuai CNT-05. | Sedang | Tambahkan kontrak tag yang lengkap sebelum endpoint post difinalkan. |
| `src/components/common/CommentSection.tsx`, `src/services/mock/post.ts`, `src/services/api/post.ts` | MVP like/unlike komentar belum diimplementasikan, walaupun endpoint `POST /comments/:id/like` tercantum di SRS. | Sedang | Tambahkan service contract dan state UI like komentar. |
| `src/components/common/PostCard.tsx`, `src/pages/PostDetailPage.tsx` | MVP share hanya menyalin link. Opsi share ke Direct Message internal belum ada. | Sedang | Definisikan flow pemilihan conversation/recipient dan kontrak share ke DM. |
| `src/features/story/StoryViewer.tsx:151-158` | Reply story hanya menampilkan toast sukses; tidak memanggil `startConversation`/`sendMessage` dan tidak membuat message dengan `reply_to_story_id`. Ini melanggar CNT-02. | **Kritis** | ✅ Selesai — Fase A4 menghubungkan reply story ke `startConversation` + `sendMessage`, menyimpan `reply_to_story_id`, dan membuka thread chat hasilnya agar pesan langsung terlihat. |
| `src/services/mock/chat.ts`, `src/services/api/chat.ts`, `src/pages/ChatPage.tsx` | Riwayat chat belum paginated. `getMessages` selalu mengembalikan seluruh pesan dan UI tidak memiliki cursor/load-more. | Sedang | Gunakan `PaginatedResponse<Message>` dan tetapkan cursor/limit pada kontrak Go. |
| `src/pages/ProfilePage.tsx`, `src/services/mock/social.ts:546` | Service unblock tersedia tetapi tidak ada UI/route untuk melihat akun yang diblokir atau melakukan unblock. | Sedang | Tambahkan entrypoint pengelolaan blocked users atau mekanisme unblock yang dapat dicapai pengguna. |
| `src/pages/ProfilePage.tsx:356-359`, `src/services/mock/chat.ts:229` | Tombol **Pesan** tidak memiliki handler. `startConversation` tersedia tetapi tidak pernah dipakai oleh UI. | Sedang | Hubungkan tombol ke `startConversation`, lalu navigasikan ke conversation terpilih. |
| `src/pages/ProfilePage.tsx`, `src/pages/PostDetailPage.tsx`, `src/components/common/CommentSection.tsx` | Report hanya tersedia untuk target user. MVP report post dan comment belum memiliki UI. | Sedang | Buat report action reusable untuk `user`, `post`, dan `comment`. |
| `src/pages/RecoverAccountPage.tsx:286-297` | Recovery email Skenario B hanya menampilkan email tersamarkan. SRS menyatakan pengguna dapat mengganti email setelah verifikasi. | Sedang | Tambahkan langkah set email baru dan kontrak backend yang memvalidasi recovery token. |
| `src/pages/EditProfilePage.tsx`, `src/services/mock/social.ts:243-281`, `src/pages/ProfilePage.tsx` | Link eksternal tersedia di form, tetapi tidak dimuat dari profil, diabaikan oleh mock update, tidak ada di `User`, dan tidak ditampilkan di halaman profil. | Sedang | Putuskan field schema final, lalu dukung read/write/display secara konsisten. |
| `src/pages/EditProfilePage.tsx:218-228`, `src/services/mock/social.ts:248-252`, `src/services/mock/social.ts:438-447` | SOC-05 hanya berupa peringatan; pembatasan username 1x/bulan tidak ditegakkan. SOC-04 cancel request tersedia melalui unfollow, tetapi expiry request tidak ada. | Sedang | Backend harus menjadi enforcement source; frontend menampilkan cooldown/expiry dari response. |
| `src/services/mock/auth.ts`, `src/services/mock/social.ts`, `src/features/auth/AuthContext.tsx` | User yang baru register hanya ditambahkan ke database mock auth, bukan database social. Session register juga tidak disimpan. Setelah verifikasi, profil user baru tidak ditemukan dan sesi hilang saat refresh. | **Kritis** | ✅ Selesai — Fase A1 menyatukan store mock dan Fase A2 menambahkan session adapter tunggal, persist pending session saat register, hydrate user dari storage, serta aktivasi sesi verified setelah OTP sukses. |
| `src/features/*`, `src/pages/*`, `src/components/common/*` | Struktur Fase 0 tidak dijalankan secara konsisten. Folder `features/chat`, `feed`, `notification`, `post`, `profile`, dan `search` tetap kosong, sedangkan logic besar berada di pages/common. | Sedang | Tetapkan ulang boundary feature atau perbarui arsitektur resmi; jangan mempertahankan struktur dokumentasi yang tidak nyata. |
| `src/components/common/Avatar.tsx`, `src/services/mock/chat.ts` | Tidak ditemukan fitur ADV lengkap yang aktif di produk. Yang ada berupa scaffolding seperti `Avatar.online`, `is_close_friend`, dan auto-reply bot non-SRS; belum setara implementasi online status/read receipt/Close Friends. | Sekadar Catatan | Tandai scaffolding sebagai non-production dan jangan masukkan sebagai status fitur ADV selesai. |
| `src/pages/CreatePostPage.tsx`, `src/features/story/CreateStoryModal.tsx`, `src/pages/ChatPage.tsx` | “Upload” media MVP masih berupa input URL, bukan pemilihan/upload file. Ini cukup untuk mock demo tetapi belum memenuhi flow upload nyata. | Sedang | Tentukan multipart/presigned-upload contract sebelum integrasi storage/backend. |

---

## B. Hasil Bug Fixing Sebelumnya

| Bug | Status Verifikasi | Temuan | Urgensi | Rekomendasi |
|---|---|---|---:|---|
| Avatar persegi | **Terverifikasi selesai** | Root cause pada wrapper `Avatar` sudah diperbaiki dengan `rounded-full overflow-hidden`. Pencarian seluruh `<img>` tidak menemukan avatar user lain yang dirender sebagai `<img>` langsung; `<img>` tersisa adalah media post/story/chat/preview. | Sekadar Catatan | Tambahkan visual regression test untuk seluruh ukuran avatar dan story ring. |
| Tombol Detail → Follow di Beranda | **Selesai untuk mock, belum backend-ready** | `FollowButton` sekarang menggantikan link Detail dan state di-refresh. Namun handler masih dynamic-import langsung ke mock dan seluruh error ditelan, sehingga gagal follow dapat terlihat seperti tidak terjadi apa-apa. | Sedang | Gunakan service entrypoint dan tampilkan feedback error/sukses yang konsisten. |
| Spinner flicker di chat | **Root cause utama terselesaikan** | Dependency fetch message dipersempit ke `activeConv?.id`; polling tidak lagi memicu spinner setiap object conversation berubah. Masih ada warning dependency lint dan potensi race antara polling conversation dengan fetch message. | Rendah | Pertahankan loading hanya saat conversation ID berubah dan tambahkan request cancellation/race guard. |
| Notifikasi follow tidak update | **✅ Selesai untuk mock-level (Fase A3)** | Seed follow request kini direkonsiliasi terhadap relasi `mockFollows` yang benar-benar `pending`, notifikasi `follow_request` memakai `reference_id = follow.id`, dan aksi Setujui/Tolak memproses request berdasarkan identifier itu alih-alih menebak dari actor. Manipulasi localStorage langsung dari social service juga sudah dihapus. | **Kritis** | Untuk backend asli nanti, response notifikasi/follow request tetap perlu dibuat atomik di server, tetapi blocker mock/frontend-nya sudah selesai. |

---

## C. Konsistensi UI/Komponen

| Lokasi | Temuan | Urgensi | Rekomendasi |
|---|---|---:|---|
| Banyak file pages/features; contoh `ChatPage.tsx`, `NotificationPage.tsx`, `PostCard.tsx`, `CommentSection.tsx` | `Button`, `Input`, dan `IconButton` tidak dipakai konsisten. Terdapat banyak tombol/input manual dengan style berulang dan state disabled/focus yang berbeda. | Sedang | Buat variant common yang diperlukan lalu migrasikan elemen aksi berulang secara bertahap. |
| `NotificationPage.tsx`, `SearchPage.tsx`, `ChatPage.tsx`, `StoryViewersModal.tsx` | Empty state sering ditulis manual walau `EmptyState` tersedia, menghasilkan spacing/icon/copy yang berbeda. | Rendah | Gunakan `EmptyState` atau variant compact/list. |
| `src/index.css`, `CreateStoryModal.tsx`, `StoryViewer.tsx`, `ChatPage.tsx`, `PostCard.tsx` | Mayoritas memakai token, tetapi masih ada hardcoded hex dan palette default `rose/purple/indigo/emerald/teal/slate` di luar token brand/surface/status Fase 1. | Rendah | Dokumentasikan palette tambahan atau pindahkan ke semantic tokens. |
| `HomePage.tsx`, `StoriesBar.tsx`, `ProfilePage.tsx`, `ChatPage.tsx`, `NotificationPage.tsx`, `SearchPage.tsx` | Error fetch umumnya hanya dicetak ke console lalu UI berubah menjadi empty state/blank state. Pengguna tidak dapat membedakan data kosong dari request gagal. | Sedang | Tambahkan explicit error state dan retry action pada setiap data screen. |
| `src/components/layout/Navbar.tsx:14-16` | Badge mobile masih hardcoded `3` dan `5`, sedangkan Sidebar/BottomNav membaca mock count dinamis. UI dapat menampilkan angka berbeda pada device yang sama. | Sedang | Gunakan satu unread-count source untuk seluruh layout. |
| Seluruh halaman utama | Loading dan empty state dasar sudah tersedia pada feed, profil, followers/following, requests, search, chat, notification, comment, dan story viewers. | Sekadar Catatan | Pertahankan coverage ini saat migrasi ke API; fokus berikutnya adalah error/retry state. |

---

## D. Kualitas Kode & TypeScript

| Lokasi | Temuan | Urgensi | Rekomendasi |
|---|---|---:|---|
| Seluruh `src/` | `npx tsc --noEmit` lulus; strict mode, unused locals, dan unused parameters aktif. | Sekadar Catatan | Jadikan type-check sebagai CI gate terpisah dari build output. |
| `package.json`, `.eslintrc.json` | `npm run lint` tidak dapat berjalan normal karena project memakai ESLint 9 tetapi konfigurasi masih format `.eslintrc`. | Sedang | Migrasikan ke `eslint.config.js` atau pin versi ESLint yang kompatibel. |
| Seluruh `src/` | Mode lint legacy menemukan 57 masalah: 41 error dan 16 warning, termasuk empty catch, state update in effect, ref access saat render, dependency hook, static component, dan manual memoization. | Sedang | Selesaikan error lint per kelompok dan aktifkan kembali `--max-warnings 0` sebagai gate. |
| 14 penggunaan eksplisit; contoh `ChatPage.tsx:61,177`, `SearchPage.tsx:57,68`, `services/mock/search.ts:32-50`, `services/api/post.ts:66` | Masih ada `any` untuk timer, error, DB helper, notification parsing, dan return service. | Sedang | Gunakan `ReturnType<typeof setInterval>`, `unknown`, serta entity/response types spesifik. |
| `src/types/index.ts` dibanding SRS §10 | Types belum 1:1. Field/tabel yang tidak terwakili antara lain post tags, hashtag entities, conversation participants, `location`, `comments_disabled`, `order_index`, `music_track_url`, `is_pinned`, `collection_name`, `visibility`, `is_group`, dan `messages.is_read`. | Sedang | Generate/maintain contract types dari schema final; pisahkan field MVP dan ADV tanpa menghilangkan shape DB. |
| `src/types/auth.ts`, `src/types/social.ts`, `src/types/index.ts` | Entity `User`, `Follow`, `AuthTokens`, `FollowStatus`, dan `ReportReason` didefinisikan lebih dari sekali dengan nullability/field berbeda. | Sedang | Tetapkan satu canonical domain type dan re-export dari file feature. |
| 17 lokasi `console.*` | Ada console error/info untuk fetch failure, OTP, report, share, dan bot. Dev server merespons 200, tetapi console browser interaktif belum dapat diverifikasi. | Rendah | Ganti dengan logger development-safe dan lakukan smoke test browser sebelum backend integration. |
| `package.json`, seluruh repo | Tidak ada script test atau file test untuk business rule, service contract, route guard, maupun regression empat bug. | Sedang | Tambahkan minimal unit/service tests dan beberapa component regression tests. |
| `ShowcasePage.tsx`, `hasActiveStory`, `startConversation`, `unblockUser`, beberapa `.gitkeep` | Ada code/scaffolding yang tidak dipakai oleh flow produk atau hanya dapat dicapai sebagai halaman showcase internal. | Rendah | Klasifikasikan sebagai dev-only, implementasikan flow pemakainya, atau hapus setelah persetujuan. |
| Banyak `catch {}` di mock services dan layout | Error sengaja ditelan, sehingga kegagalan cross-service notification/storage tidak terdeteksi dan UI bisa terlihat sukses. | Sedang | Tangani hanya error yang memang aman diabaikan; log terstruktur atau propagate error lainnya. |

---

## E. Service Layer & Kesiapan Integrasi Backend

| Lokasi | Temuan | Urgensi | Rekomendasi |
|---|---|---:|---|
| Hampir seluruh pages/components/features; lihat import `services/mock/*` | Switch mock/API Fase 7 tidak efektif. Hampir seluruh UI langsung mengimpor mock; hanya sebagian AuthContext memakai `src/services/index.ts`. Mengubah `VITE_USE_MOCK=false` tidak memindahkan aplikasi ke API asli. | **Kritis** | Larang import mock dari UI melalui lint rule dan migrasikan semua consumer ke service facade. |
| `src/features/auth/AuthContext.tsx`, `src/services/apiClient.ts`, `src/services/mock/auth.ts` | API login response tidak disimpan. `apiClient` membaca key `access_token`, sedangkan mock menyimpan JSON pada `twistgram_tokens`; hydration/logout tetap memakai helper mock. Request API setelah login berpotensi tanpa Bearer token dan sesi hilang saat refresh. | **Kritis** | ✅ Selesai (mock-level) — Fase A2 memusatkan storage user/token di adapter sesi tunggal yang dipakai login, register, verify OTP, hydrate, logout, dan request interceptor. |
| `.env.example`, `src/services/index.ts` | `VITE_API_BASE_URL` sudah ada, tetapi `VITE_USE_MOCK` yang mengontrol switch tidak dicantumkan. | Sedang | Tambahkan variable beserta nilai/default dan penjelasan mode. |
| `src/services/api/auth.ts`, `notification.ts`, `chat.ts`, `story.ts` | Ada endpoint yang tidak tercantum di SRS: `/auth/check-username`, `/auth/check-email`, `/notifications/read-all`, `POST /notifications`; unread count dan `hasActiveStory` juga tidak punya kontrak. | Sedang | Tambahkan endpoint resmi ke contract atau ubah helper agar diturunkan dari response endpoint yang sah. |
| `src/services/api/*.ts`, SRS §11 | SRS hanya mencantumkan method/path, belum request/response body. Implementasi mencampur camelCase dan snake_case serta selalu mengasumsikan `res.data` adalah entity langsung. Keselarasan response shape tidak dapat dikonfirmasi. | Sedang | Buat OpenAPI/contract document sebelum coding backend dan tetapkan envelope/error/pagination/upload shape. |
| `src/services/apiClient.ts:37-43` | Refresh token masih TODO. Tidak ada retry request, token rotation, atau forced logout saat refresh gagal. | Sedang | ⏳ Tuntas sebagian — Fase A2 sudah memindahkan pembacaan access token ke session adapter tunggal. `// TODO(backend):` retry/rotation tetap menunggu backend auth asli. |
| `ChatPage.tsx:24-34`, `SearchPage.tsx:12,35-47`, `social.ts:462-503` | Komponen/service membaca atau menulis localStorage dan internal mock arrays secara langsung. Abstraksi bocor sehingga tidak dapat diganti API tanpa rewrite UI. | Sedang | Pindahkan seluruh akses state ke service/repository layer. |
| `mock/auth.ts`, `mock/social.ts`, `mock/post.ts`, `mock/story.ts` | Data user diduplikasi di beberapa module dengan field dan lifecycle berbeda. Update/register pada satu store tidak otomatis sinkron ke store lain. | Sedang | ✅ Selesai — Fase A1 memindahkan entity mock ke `src/services/mock/database.ts` sebagai store terpusat dengan helper persist/sync legacy storage. |
| `src/services/api/chat.ts:43-47`, `src/services/api/story.ts:52-57` | Beberapa API helper mengembalikan nilai hardcoded (`0`, `false`), sehingga mode API akan menampilkan unread/story state yang salah walau backend hidup. | Sedang | Implementasikan dari endpoint nyata atau hapus helper dari kontrak UI. |
| `src/services/api/*.ts` dibanding SRS §11 | Method/path resource utama—auth, profile, follow, post, story, search, conversation, notification read, report—secara umum sudah mengikuti daftar endpoint SRS. | Sekadar Catatan | Pertahankan mapping path ini saat memperjelas body dan response contract. |

---

## F. Dokumentasi & Kerapian Project

| Lokasi | Temuan | Urgensi | Rekomendasi |
|---|---|---:|---|
| `README.md` | README masih menyebut React 18 dan React Router v6, sedangkan package memakai React 19 dan React Router 7. Instruksi `cd twistgram-web-js` juga tidak sesuai nama repo. Status Fase 2–7 masih “akan datang”. | Sedang | Perbarui versi, install/run, nama folder, environment, dan status fitur aktual. |
| `README.md:58-80` | Struktur folder terdokumentasi tidak sesuai keadaan nyata: sebagian besar feature/hook/style/assets kosong, service API tidak disebut, dan deskripsi mock “diganti API call di Phase 7” tidak terjadi. | Sedang | Dokumentasikan struktur aktual dan boundary yang dipilih setelah refactor service. |
| `src/pages/ShowcasePage.tsx`, `src/routes/index.tsx:111`, `src/pages/ProfilePage.tsx:337` | Component showcase Fase 1 masih menjadi protected product route dan tombol settings profil diarahkan ke showcase. | Rendah | Jadikan dev-only route atau hapus dari navigasi produksi. |
| `tsconfig.build-temp.json`, `TODO.md` | Ada config sementara tanpa script pemakai. TODO bug hanya mencatat Bug 1, 3, 4 dan melewatkan Bug 2, sehingga tidak menjadi histori pekerjaan yang utuh. | Rendah | Hapus/jelaskan config sementara dan rapikan issue tracking. |
| `.gitignore`, hasil `git ls-files`/`git check-ignore` | `.gitignore` sudah mencakup `node_modules`, `dist`, `.env*`, editor, log, dan TypeScript cache. `dist/` serta `node_modules/` tidak ter-track; `.env.example` tetap ter-track sebagaimana mestinya. | Sekadar Catatan | Pertahankan konfigurasi ini. |
| `git log` Fase 0–7 | Seluruh commit memakai bentuk Conventional Commit yang valid. Namun scope/bahasa fase tidak konsisten (`phase-1`, `auth`, `profile`, `routes`, `story`, `fase-6`, `services`) dan commit bug terakhir terlalu umum untuk empat regression berbeda. | Rendah | Standarkan scope dan buat subject yang menggambarkan domain/perubahan utama. |
| Root project dan tracked files | Tidak ditemukan `.env` asli yang ter-track. Hanya `.env.example` yang masuk repository. | Sekadar Catatan | Jangan commit secret saat base URL/backend credential mulai ditambahkan. |
| Komentar di `apiClient.ts`, `services/mock/*.ts`, `ProfilePage.tsx` | Beberapa komentar sudah usang/menyesatkan: mock disebut akan “diganti tanpa mengubah component”, Fase 7 disebut selesai, dan grid profile masih disebut placeholder. | Rendah | Perbarui komentar setelah boundary service final; dokumentasikan hanya business rule yang tidak terlihat dari kode. |

---

## Kesimpulan Audit

Frontend saat ini layak sebagai demo UI berbasis mock, tetapi **belum siap langsung dihubungkan ke backend Go**. Lima blocker kritis adalah:

1. Story reply tidak menghasilkan DM. ✅ Selesai di Fase A4.
2. Registrasi/session user baru terpecah antar mock store.
3. Fix notifikasi follow masih bergantung pada data seed yang tidak konsisten dan manipulasi storage. ✅ Selesai di Fase A3 (mock-level).
4. UI melewati service switch dan mengimpor mock secara langsung.
5. Token/session API tidak disimpan atau dipasang secara konsisten. ✅ Selesai di Fase A2 (mock-level); sisa refresh-token backend tetap terpisah.

Update tindak lanjut:
- Fase A1 (21 Juni 2026): store mock terpusat sudah dibuat di `src/services/mock/database.ts`; temuan duplikasi data mock selesai dan blocker registrasi lintas store turun menjadi sisa masalah session/hydration yang dijadwalkan ke Fase A2.
- Fase A2 (21 Juni 2026): session adapter tunggal sudah dipakai oleh mock auth, AuthContext, OTP verification, dan `apiClient`; register/verify/login/logout kini konsisten di atas storage yang sama.
- Fase A3 (21 Juni 2026): notifikasi follow request kini direferensikan ke `follow.id`, seed invalid direkonsiliasi, dan approve/decline tidak lagi menebak request dari kombinasi actor/recipient.
- Fase A4 (21 Juni 2026): reply story kini membuat DM sungguhan dengan `reply_to_story_id`, lalu mengarahkan user ke conversation terkait supaya pesan balasan langsung terlihat.
