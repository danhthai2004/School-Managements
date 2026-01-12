# ISS - Intelligent School Management System

### Backend

- Java 21
- Spring Boot 4.0.1
- Spring WebMVC, Spring Security, Spring Data JPA, Validation
- OAuth2 Client (`spring-boot-starter-oauth2-client`) + `google-api-client`
- PostgreSQL

### Frontend

- React 19 + TypeScript
- Vite
- Tailwind CSS

### Infra

- Docker, Docker Compose
- Nginx (serve frontend build trong container)

### Đã có (hiện trạng repo)

- Docker Compose dựng 3 service: **postgres + backend + frontend**
- Backend cấu hình sẵn kết nối PostgreSQL + JPA + Security (mới ở mức dependency/config)
- Frontend có:
  - Axios instance dùng `VITE_API_URL`
  - Service layer gọi API `/auth/*` (khung)
  - Component Google Login (UI) dùng `@react-oauth/google`

> Lưu ý: Backend hiện **chưa có API endpoint hoàn chỉnh**, nên các route `/auth/*` ở frontend mới là “khung gọi API” để bạn triển khai tiếp.

### Định hướng phát triển (gợi ý)

- Auth: Google OAuth2 → JWT, phân quyền (Admin/Teacher/Student)
- CRUD: Student, Teacher, Class, Subject, Enrollment
- Attendance (điểm danh), Gradebook (điểm), Fee/Invoice (học phí)
- Dashboard + báo cáo

## Yêu cầu môi trường

### Chạy bằng Docker (khuyến nghị)

- Docker Engine / Docker Desktop
- Docker Compose v2

### Chạy dev cục bộ (không dùng Docker)

- JDK 21
- Node.js 20+
- PostgreSQL 16+
- Maven (hoặc dùng `./mvnw` trong repo)

## Chạy nhanh với Docker Compose

Tại thư mục root (nơi có `docker-compose.yml`):

```bash
docker compose up --build
```

Mặc định:
Frontend: http://localhost:3000
Backend: http://localhost:8081
Postgres: localhost:5432
user: postschool
password: school
db: school_db

## Dừng và xoá container:

```bash
docker compose down
```

## Dừng và xoá container + xoá volume:

```bash
docker compose down -v
```

## Chạy dev cục bộ

1. Database
   Tạo DB school_db trong PostgreSQL (hoặc dùng Docker riêng cho Postgres).

2. Backend
   cd backend
   ./mvnw spring-boot:run

Backend chạy trên http://localhost:8081.

3. Frontend
   cd frontend
   npm install
   npm run dev

Vite dev server thường chạy http://localhost:5173
