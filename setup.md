---
description: Thiết lập và chạy dự án School-Managements (Full Stack - Dev mode, Frontend only, Backend only, Production)
---

# 🚀 Setup & Run Project School-Managements

## 📋 Yêu cầu hệ thống

### Development (Windows/Mac/Linux)
- **Node.js**: >= 18.x (khuyến nghị 20.x)
- **Java**: JDK 21
- **Maven**: 3.9+ 
- **Docker**: Cho PostgreSQL (Local)

### Production (AWS EC2)
- **Docker + Docker Compose**
- **Neon Database** (Serverless PostgreSQL)
- **AWS Security Group**: Phải mở Port 80, 443 và **22 (SSH)**.

---

## 🔧 Chế độ 1: Local Development (Postgres Local)

### Bước 1: Chuẩn bị file .env
Copy nội dung từ `backend/.env.example` và `frontend/.env.example` vào file `.env` ở thư mục gốc.

### Bước 2: Khởi động Database Local
```powershell
docker compose up -d postgres
```

### Bước 3: Chạy Backend (8081)
```powershell
cd backend
./mvnw spring-boot:run
```

### Bước 4: Chạy Frontend (3000)
```powershell
cd frontend
npm install
npm run dev -- --port 3000
```

---

## 🌐 Chế độ 2: Deploy Production (EC2 + Neon DB)

### 2.1 Cấu hình GitHub Actions
1. Vào GitHub Repo -> Settings -> Secrets -> Actions.
2. Cài đặt các Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.
3. Đảm bảo workflow `.github/workflows/deploy-backend.yml` có đường dẫn (CD) đúng với thư mục trên EC2.

### 2.2 Thiết lập trên EC2 (Chỉ làm lần đầu)
1. **Tạo thư mục dự án**: `mkdir -p ~/~backend/School-Managements`
2. **Tạo file .env**: 
   ```bash
   nano ~/~backend/School-Managements/.env
   ```
   *Dán nội dung cấu hình Production (Neon Database URL, Domain thực tế).*

### 2.3 Lệnh quản lý trên EC2
Mỗi khi có code mới, GitHub Actions sẽ tự chạy. Nếu muốn quản lý tay:
```bash
cd ~/~backend/School-Managements

# Xem log backend
docker compose -f docker-compose.prod.yml logs -f backend

# Khởi động lại bằng tay
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
```

---

## 📁 Cấu trúc Project
```
School-Managements/
├── backend/           # Spring Boot API
├── frontend/          # React + Vite
├── docker-compose.yml # Dùng cho Local (Postgres container)
├── docker-compose.prod.yml # Dùng cho Prod (Neon DB)
└── .env.example       # Mẫu cấu hình môi trường
```

## 🐛 Troubleshooting

| Lỗi | Cách xử lý |
| :--- | :--- |
| **i/o timeout (Port 22)** | Kiểm tra Inbound Rule trên AWS Security Group (Mở Port 22 cho 0.0.0.0/0). |
| **Failed DataSource** | Kiểm tra biến `SPRING_DATASOURCE_URL` trong `.env` trên EC2 phải có tiền tố `jdbc:`. |
| **CORS Error** | Cập nhật `APP_CORS_ALLOWED_ORIGINS` trong `.env` bao gồm cả `https://iss-edu.site`. |
| **Out of Memory** | Nếu build bị 'Killed', hãy thêm bộ nhớ Swap cho EC2 (t2.micro). |
