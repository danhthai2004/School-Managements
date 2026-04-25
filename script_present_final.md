# Script Thuyết Trình 5 Phút — DB, DB Diagram & Testing
## Dự án: School Management Intelligent System

> **Ước lượng thời gian:** ~5 phút | ~700–750 từ nói

---

## PHẦN 1 — DATABASE (~1 phút 30 giây)

---

### Công nghệ & Cấu hình

Hệ thống dùng **PostgreSQL 16** với extension **pgvector** — pgvector là điểm đặc biệt so với một hệ thống quản lý trường học thông thường, vì nó cho phép lưu trực tiếp **vector embedding** của khuôn mặt học sinh vào database để phục vụ điểm danh bằng nhận diện khuôn mặt.

Schema được quản lý qua **Hibernate DDL auto-update**, toàn bộ stack chạy trên **Docker Compose** gồm 5 service: PostgreSQL, pgAdmin, Spring Boot backend (port 8081), React frontend (port 3000), và Face Recognition Service viết bằng FastAPI (port 8001).

---

### Quy mô Database

Hệ thống có **46 JPA Entity** tương ứng **46 Spring Data Repository**, tổ chức theo **15 nhóm nghiệp vụ**. Thay vì đi qua hết 46 bảng, tôi sẽ tập trung vào những nhóm thể hiện rõ nhất tính năng của hệ thống.

---

## PHẦN 2 — CÁC NHÓM ENTITY CHÍNH (~2 phút)

---

### Nhóm 1 — Lõi hệ thống: School · User · Student · Teacher

Đây là 4 entity trung tâm. Mọi bảng khác đều có `school_id` — đây là kiến trúc **multi-tenant theo trường**, mỗi trường hoàn toàn cách ly dữ liệu với trường khác.

`User` là tài khoản đăng nhập với 5 role: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `GUARDIAN`. `User` liên kết 1-1 với `Teacher` hoặc `Student`.

`Teacher` có trường `maxPeriodsPerWeek` — ràng buộc số tiết tối đa mỗi tuần, được dùng trực tiếp trong thuật toán xếp thời khoá biểu.

---

### Nhóm 2 — Học vụ: AcademicYear · Semester · ClassRoom · Timetable

Đây là xương sống quản lý học vụ. `AcademicYear` → `Semester` → `ClassRoom` tạo thành chuỗi phân cấp thời gian.

`TimetableDetail` là bảng phức tạp nhất về ràng buộc — nó có **2 unique constraint song song**:
- `(timetable_id, classroom_id, dayOfWeek, slotIndex)` → đảm bảo lớp không bị xếp 2 tiết cùng một khung giờ
- `(timetable_id, teacher_id, dayOfWeek, slotIndex)` → đảm bảo giáo viên không dạy 2 nơi cùng một lúc

Đây là logic nghiệp vụ quan trọng được enforce trực tiếp ở tầng database, không chỉ ở tầng application.

---

### Nhóm 3 — Điểm số & Điểm danh

`Grade` lưu điểm tổng hợp theo công thức: điểm thường xuyên (`RegularScore`) + điểm giữa kỳ + điểm cuối kỳ = điểm trung bình. Mọi thay đổi điểm được ghi vào `GradeHistory` với `oldValue`, `newValue`, và `reason` — audit trail đầy đủ.

`Attendance` ghi nhận từng học sinh theo từng tiết học. `AttendanceSummary` tổng hợp tỉ lệ chuyên cần theo học kỳ. `DailyClassStatus` có trường `isFinalized` — giáo viên phải xác nhận hoàn tất điểm danh mỗi ngày trước khi dữ liệu được chốt.

---

### Nhóm 4 — Tính năng "Intelligent": AI · Risk · Face Recognition

Đây là phần phân biệt dự án với một hệ thống quản lý trường học thông thường.

**Nhận diện khuôn mặt**: `FacialRecognitionData` lưu embedding vector khuôn mặt của từng học sinh (quan hệ 1-1 với Student), `FacialRecognitionLog` ghi lại kết quả mỗi lần nhận diện với `confidenceScore` và các trạng thái như `SUCCESS`, `LOW_CONFIDENCE`, `NO_FACE`.

**Dự báo rủi ro học sinh**: `RiskAssessmentHistory` ghi lịch sử đánh giá rủi ro với `riskCategory` gồm 5 loại: ATTENDANCE, ACADEMIC, CONDUCT, HEALTH, SOCIO_ECONOMIC. Hệ thống sinh ra `aiReason` (giải thích từ AI) và `aiAdvice` (lời khuyên thân thiện gửi cho học sinh). Giáo viên có thể phản hồi qua `teacherFeedback`: CONFIRMED hoặc REJECTED.

`RiskMetricsSnapshot` chụp chỉ số mỗi ngày: số buổi vắng 7 ngày, tỉ lệ chuyên cần 30 ngày, GPA hiện tại, số môn đang rớt — làm đầu vào cho model AI.

`MlModel` quản lý các model đã train: RISK_PREDICTION, GRADE_PREDICTION, RECOMMENDATION, FACIAL_RECOGNITION — mỗi model lưu `accuracy`, `f1Score`, `isActive`.

---

## PHẦN 3 — DB DIAGRAM: Quan hệ Cốt Lõi (~45 giây)

---

Sơ đồ có thể tóm gọn theo 3 trục:

**Trục học vụ**: `School` → `AcademicYear` → `Semester` → `ClassRoom` → `ClassEnrollment` → `Student`

**Trục giảng dạy**: `Teacher` ↔ `Subject` (ManyToMany) → `TeacherAssignment` → `TimetableDetail`

**Trục thông minh**: `Student` → `FacialRecognitionData` → embedding vector | `Student` → `RiskMetricsSnapshot` → `RiskAssessmentHistory` ← `MlModel`

Toàn bộ 3 trục đều neo vào `School` — đây là điểm đảm bảo cách ly dữ liệu đa trường.

---

## PHẦN 4 — TESTING (~45 giây)

---

Về testing, hệ thống hiện có **1 test tự động** duy nhất:

```java
@SpringBootTest
class IssApplicationTests {
    @Test
    void contextLoads() { }
}
```

Test này xác nhận toàn bộ Spring Application Context khởi động thành công — tức là mọi bean, cấu hình, và kết nối database không có lỗi khi ứng dụng start. Đây là **smoke test** chạy tự động trong mỗi Maven build.

Ngoài ra, kiểm thử tính năng được thực hiện thủ công qua Postman cho API, pgAdmin cho database, và trực tiếp trên giao diện React cho end-to-end flow.

Nếu hệ thống chuyển sang production, 3 module cần bổ sung test tự động đầu tiên là: **tính điểm trung bình**, **xếp lịch thời khoá biểu** (do ràng buộc unique phức tạp), và **xác thực OTP**.

---

*End of script — ~5 phút*
