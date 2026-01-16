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
- Backend: Spring Boot 4, Spring Security, JPA (Postgres), JWT, Gmail SMTP, Google ID token verify
- Frontend: React + Vite + Tailwind, React Router, Google OAuth (`@react-oauth/google`)

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
user: postgres
password: postgres
db: school_db

### A) Seed system admin

- Email: `kazejustworking@gmail.com`
- Password: theo `.env` (`SYSTEM_ADMIN_PASSWORD`)

## Dừng và xoá container:

```bash
docker compose down
```

## Dừng và xoá container + xoá volume:

```bash
docker compose down -v
```

## Chạy dev cục bộ

1. Docker

   ```bash
   docker compose up --build
   ```

2. Backend
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

Backend chạy trên http://localhost:8081.

3. Frontend
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Frontend chạy trên http://localhost:5173
