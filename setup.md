---
description: Thiết lập và chạy dự án School-Managements (Full Stack - Dev mode, Frontend only, Backend only, Production)
---

# 🚀 Setup & Run Project School-Managements

## 📋 Yêu cầu hệ thống

### Development (Windows/Mac/Linux)

- **Node.js**: >= 18.x (khuyến nghị 20.x)
- **Java**: JDK 21
- **Maven**: 3.9+ (hoặc dùng mvnw wrapper)
- **PostgreSQL**: 16.x
- **Docker**: (Optional) cho PostgreSQL hoặc full stack

### Production (VPS/EC2)

- **Docker** + **Docker Compose**
- **Nginx** (reverse proxy)
- Domain: **iss-edu.site**

---

## 🔧 Chế độ 1: Web Dev Full Stack (Port 3000 + 8081)

### Bước 1: Khởi động PostgreSQL (Docker)

```powershell
# Từ thư mục gốc dự án
docker compose up -d postgres
```

### Bước 2: Chạy Backend (Port 8081)

```powershell
cd backend
./mvnw spring-boot:run
```

> Backend sẽ chạy tại: http://localhost:8081

### Bước 3: Chạy Frontend (Port 3000)

```powershell
cd frontend
npm install
npm run dev -- --port 3000
```

> Frontend sẽ chạy tại: http://localhost:3000

### Bước 4: Truy cập

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8081/api
- **Login mặc định**:
  - Email: `kazejustworking@gmail.com`
  - Password: `issSP26capstone!`

---

## 🎨 Chế độ 2: Only Frontend (Port 3000)

> ⚠️ Cần Backend đang chạy ở port 8081

### Thiết lập

```powershell
cd frontend

# Cài đặt dependencies
npm install
```

### Cấu hình API URL (frontend/.env)

```env
VITE_API_URL=http://localhost:8081/api
VITE_GOOGLE_CLIENT_ID=223624314948-ffetgsj8md7bg4t7pn7cds26hto6llnm.apps.googleusercontent.com
```

### Chạy

```powershell
npm run dev -- --port 3000
```

### Build Production

```powershell
npm run build
npm run preview -- --port 3000
```

---

## ⚙️ Chế độ 3: Only Backend (Port 8081)

### Option A: Với PostgreSQL Docker

```powershell
# Từ thư mục gốc
docker compose up -d postgres

# Chạy backend
cd backend
./mvnw spring-boot:run
```

### Option B: Với PostgreSQL cài sẵn

1. Tạo database:

```sql
CREATE DATABASE school_db;
```

2. Cấu hình connection trong `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/school_db
spring.datasource.username=postgres
spring.datasource.password=postgres
```

3. Chạy:

```powershell
cd backend
./mvnw spring-boot:run
```

### Kiểm tra

```powershell
curl http://localhost:8081/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"kazejustworking@gmail.com","password":"issSP26capstone!"}'
```

---

## 🌐 Chế độ 4: Deploy Production (iss-edu.site)

### 4.1 Chuẩn bị VPS/EC2

```bash
# SSH vào server
ssh -i "your-key.pem" ubuntu@your-server-ip

# Cài Docker
chmod +x setup_ec2.sh
./setup_ec2.sh

# Log out và log in lại để docker group có hiệu lực
```

### 4.2 Clone code

```bash
git clone https://github.com/danhthai2004/School-Managements.git app
cd app
```

### 4.3 Cấu hình environment

Tạo file `.env` tại thư mục gốc:

```env
JWT_SECRET=8479ffb2912628c005604223f15ec198a6a14200680b96229ddd2a6bf811618b
SYSTEM_ADMIN_EMAIL=kazejustworking@gmail.com
SYSTEM_ADMIN_PASSWORD=issSP26capstone!
GOOGLE_OAUTH_CLIENT_ID=223624314948-ffetgsj8md7bg4t7pn7cds26hto6llnm.apps.googleusercontent.com
MAIL_USERNAME=kazejustworking@gmail.com
MAIL_APP_PASSWORD=begsjvqjozdilmtj
APP_CORS_ALLOWED_ORIGINS=http://localhost:3000,https://www.iss-edu.site,https://iss-edu.site
```

### 4.4 Build & Deploy với Docker

```bash
docker compose up -d --build
```

### 4.5 Cấu hình Nginx

```bash
# Copy nginx config
sudo cp deploy/nginx-iss-edu-http /etc/nginx/sites-available/iss-edu.site
sudo ln -s /etc/nginx/sites-available/iss-edu.site /etc/nginx/sites-enabled/

# Build frontend và copy files
cd frontend && npm run build
sudo mkdir -p /var/www/iss-edu.site/frontend
sudo cp -r dist/* /var/www/iss-edu.site/frontend/

# Test và reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 4.6 SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d iss-edu.site -d www.iss-edu.site
```

### 4.7 Kiểm tra

- **Website**: https://iss-edu.site
- **API**: https://iss-edu.site/api

---

## 📁 Cấu trúc Project

```
School-Managements/
├── backend/           # Spring Boot API (port 8081)
│   ├── src/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/          # React + Vite (port 3000)
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── deploy/            # Deployment scripts & configs
│   ├── nginx-iss-edu-http
│   ├── setup_ec2.sh
│   └── DEPLOY.md
├── docker-compose.yml # Development
├── docker-compose.prod.yml # Production
└── .env               # Environment variables
```

---

## 🐛 Troubleshooting

### Lỗi CORS

- Kiểm tra `APP_CORS_ALLOWED_ORIGINS` trong `.env`
- Đảm bảo URL frontend nằm trong danh sách

### Lỗi Database Connection

```powershell
# Kiểm tra PostgreSQL đang chạy
docker ps | grep postgres

# Xem logs
docker logs school_postgres
```

### Port đã bị chiếm

```powershell
# Windows - tìm process
netstat -ano | findstr :3000
netstat -ano | findstr :8081

# Kill process
taskkill /PID <PID> /F
```

### Backend không start

```powershell
cd backend
./mvnw clean install -DskipTests
./mvnw spring-boot:run
```
