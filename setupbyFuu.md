Hướng dẫn khởi động

Website

Cách nhanh nhất — Docker Compose (1 lệnh):
# Tại X:\0.capstone\School-Managements
docker compose up --build
- Frontend: http://localhost:3000
- Backend API: http://localhost:8081
- Face Recognition: http://localhost:8001

Hoặc chạy dev local (3 terminal riêng):
# Terminal 1 — Database
docker compose up -d postgres

# Terminal 2 — Backend (tại X:\0.capstone\School-Managements\backend)
./mvnw spring-boot:run

# Terminal 3 — Frontend (tại X:\0.capstone\School-Managements\frontend)
npm run dev
- Frontend: http://localhost:5173
- Backend: http://localhost:8081

  ---
Mobile (Expo + React Native)

Mobile dùng ngrok để kết nối tới backend — phải chạy ngrok trước.

Bước 1 — Chạy ngrok (tại X:\0.capstone\School-Managements):
.\ngrok.exe start --config ngrok.yml --all
Backend sẽ public qua: https://rhinological-izabella-superbusily.ngrok-free.dev

Bước 2 — Khởi động Expo (tại X:\capstone\School-Management-Mobile):

# Cùng mạng WiFi với điện thoại (dùng ngrok tunnel cho Metro):
.\start-expo.ps1

# Hoặc khác mạng (tunnel hoàn toàn qua ngrok):
.\start-remote.ps1

Bước 3 — Mở app trên điện thoại:
- Cài Expo Go (App Store / Google Play)
- Scan QR code hiện trong terminal

Chạy thẳng lên Android/iOS emulator:
cd "X:\capstone\School-Management-Mobile"
npx expo start --android   # Android emulator
npx expo start --ios       # iOS simulator (Mac only)

  ---
Lưu ý quan trọng
# Hoặc khác mạng (tunnel hoàn toàn qua ngrok):
.\start-remote.ps1

Bước 3 — Mở app trên điện thoại:
- Cài Expo Go (App Store / Google Play)
- Scan QR code hiện trong terminal

Chạy thẳng lên Android/iOS emulator:
cd "X:\capstone\School-Management-Mobile"
npx expo start --android   # Android emulator
npx expo start --ios       # iOS simulator (Mac only)

  ---
Lưu ý quan trọng

┌─────────────────────────┬──────────────────────────────────────────────────────────────────┐
│                         │                                                                  │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Mobile API URL          │ Hard-code tại constants/config.ts — trỏ vào ngrok domain cố định │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Backend phải chạy trước │ Mobile không có backend riêng, dùng chung với web                │
├─────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ ngrok phải bật          │ Nếu không có ngrok, mobile không gọi được API                    │
└─────────────────────────┴──────────────────────────────────────────────────────────────────┘