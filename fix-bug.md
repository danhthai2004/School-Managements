# Terminal 1 — DB + Backend
docker compose up -d postgres                                                                                                                                                                   
cd backend                                                                                                                                                                                      
./mvnw spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm run dev -- --port 3000

Truy cập: http://localhost:3000

  ---
2. Chạy Mobile (Expo Tunnel)

# Terminal 1 — DB + Backend
docker compose up -d postgres
cd backend
./mvnw spring-boot:run

# Terminal 2 — ngrok (tunnel backend API ra ngoài internet)
.\ngrok.exe http 8081 --domain=rhinological-izabella-superbusily.ngrok-free.dev

# Terminal 3 — Expo dev server (tunnel để phone kết nối qua internet)
cd X:/0.capstone/School-Management-Mobile
npx expo start --tunnel

Scan QR code bằng Expo Go trên điện thoại.

  ---
Tại sao cần cả 2 tunnel?

┌───────────────┬──────────────────────────────────────────────────────────┐
│    Tunnel     │                         Mục đích                         │
├───────────────┼──────────────────────────────────────────────────────────┤
│ ngrok         │ Expose backend API (port 8081) → mobile app gọi API      │
├───────────────┼──────────────────────────────────────────────────────────┤
│ expo --tunnel │ Expose JS bundle (Expo dev server) → điện thoại load app │
└───────────────┴──────────────────────────────────────────────────────────┘