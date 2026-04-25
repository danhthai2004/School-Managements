# Script Thuyết Trình: DB, DB Diagram & Testing
## Dự án: School Management System

---

## PHẦN 1 — CƠ SỞ DỮ LIỆU (DATABASE)

---

### 1.1 Tổng quan hệ thống DB

> **Người thuyết trình nói:**

Hệ thống sử dụng **PostgreSQL 16** làm cơ sở dữ liệu chính, với extension **pgvector** được kích hoạt để hỗ trợ lưu trữ vector embedding phục vụ module nhận diện khuôn mặt.

Toàn bộ schema được quản lý tự động qua **Hibernate DDL auto-update** — không dùng Flyway hay Liquibase — nghĩa là mỗi khi ứng dụng khởi động, Hibernate sẽ so sánh entity với bảng hiện có và cập nhật sự khác biệt.

---

### 1.2 Cấu hình kết nối

File cấu hình: `backend/src/main/resources/application.properties`

| Tham số | Giá trị |
|---|---|
| URL | `jdbc:postgresql://localhost:5432/school_db` |
| Username | `postgres` |
| Password | `postgres` |
| DDL strategy | `update` |
| Batch size | `50` |
| Timezone | `Asia/Ho_Chi_Minh` |
| Server port | `8081` |

Batch size 50 và `order_inserts=true`, `order_updates=true` được bật để tối ưu hiệu năng khi import dữ liệu hàng loạt (import danh sách học sinh, giáo viên qua Excel).

---

### 1.3 Docker Compose

File: `docker-compose.yml`

Hệ thống được container hoá gồm 5 service:

1. **PostgreSQL 16 (pgvector)** — database chính
2. **pgAdmin 4** — giao diện quản trị database
3. **Spring Boot Backend** — API server, port 8081, debug port 5005
4. **React Frontend** — giao diện web, port 3000
5. **Face Recognition Service** — FastAPI service, port 8001 (phục vụ nhận diện khuôn mặt)

---

### 1.4 Kiến trúc Entity — 46 bảng, 15 nhóm nghiệp vụ

Dự án có **46 JPA Entity** tương ứng với **46 Repository**, được tổ chức theo 15 nhóm nghiệp vụ:

---

#### NHÓM 1 — Xác thực & Người dùng

**Bảng `users`** — Tài khoản trung tâm của hệ thống.

Các trường chính:
- `id` (UUID, PK)
- `email` (unique, index)
- `fullName`, `passwordHash` (BCrypt)
- `role` — Enum 5 giá trị: `SYSTEM_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `GUARDIAN`
- `firstLogin` (Boolean, default true) — bắt đổi mật khẩu lần đầu
- `enabled` (Boolean)
- `school_id` (FK → School)
- `pendingDeleteAt` — soft delete, đánh dấu thời điểm xoá mềm

**Bảng `auth_challenges`** — Quản lý OTP xác thực.

Các trường chính:
- `user_id` (FK → User)
- `type` — Enum: `OTP_EMAIL`, `OTP_SMS`
- `codeHash` (BCrypt của mã 6 số)
- `expiresAt`, `attempts`, `verifiedAt`, `consumedAt`

---

#### NHÓM 2 — Trường học & Năm học

**Bảng `schools`**:
- `code` (unique, 20 ký tự), `name`, `address`
- `schoolLevel` — Enum: `PRIMARY`, `SECONDARY`, `HIGH_SCHOOL`
- `provinceCode`, `wardCode` (FK → Province, Ward)
- `enrollmentArea` — khu vực tuyển sinh
- `pendingDeleteAt` — soft delete

**Bảng `school_registry`**:
- Dữ liệu tra cứu trường từ danh mục quốc gia (dữ liệu nhà nước)
- Khóa chính là `code` (String, 10 ký tự)

**Bảng `academic_years`** — Năm học:
- `name` (e.g. "2024-2025"), `startDate`, `endDate`
- `status` — Enum: `UPCOMING`, `ACTIVE`, `COMPLETED`
- `school_id` (FK → School)

**Bảng `semesters`** — Học kỳ:
- `semesterNumber` (1 hoặc 2), `name` (e.g. "Học kỳ 1")
- `startDate`, `endDate`, `gradeDeadline` (hạn chốt điểm)
- `status` — Enum: `UPCOMING`, `ACTIVE`, `COMPLETED`
- FK → AcademicYear, School

**Bảng `system_settings`** và **`security_settings`**:
- Key-value configuration store
- `dataType` — STRING, INTEGER, BOOLEAN, JSON
- `isPublic` — phân biệt setting công khai vs nội bộ

---

#### NHÓM 3 — Học sinh & Phụ huynh

**Bảng `students`**:
- `studentCode` (unique per school), `fullName`, `dateOfBirth`
- `gender` — Enum: `MALE`, `FEMALE`, `OTHER`
- `status` — Enum: `ACTIVE`, `INACTIVE`, `GRADUATED`
- `school_id` (FK), `user_id` (1-1 với User), `guardian_id` (FK → Guardian)
- `preferred_combination_id` (FK → Combination) — tổ hợp môn học sinh đăng ký

**Bảng `guardians`** — Phụ huynh:
- `fullName`, `phone`, `email` (unique), `relationship` (e.g. "Mẹ", "Bố")
- `user_id` (FK → User, nullable)
- Quan hệ `@OneToMany` → Students

---

#### NHÓM 4 — Giáo viên

**Bảng `teachers`**:
- `teacherCode` (unique per school), `fullName`, `specialization`, `degree`
- `maxPeriodsPerWeek` (default 20) — ràng buộc số tiết tối đa/tuần
- `school_id`, `user_id` (1-1 với User)
- `subjects` — `@ManyToMany` qua bảng trung gian `teacher_subjects`

**Bảng `teacher_assignments`** — Phân công giảng dạy:
- FK → Teacher, ClassRoom, Subject, School
- `lessonsPerWeek` — số tiết/tuần
- `isHeadOfDepartment` (Boolean) — tổ trưởng bộ môn
- Unique constraint: `(classroom_id, subject_id)`

---

#### NHÓM 5 — Lớp học & Phòng học

**Bảng `classrooms`**:
- `name` (e.g. "12A1"), `grade` (10/11/12), `maxCapacity` (1-40)
- `session` — Enum: `SANG`, `CHIEU`
- `department` — Enum phân ban
- `status` — Enum: `ACTIVE`, `INACTIVE`, `CLOSED`
- FK → School, AcademicYear, Room, Combination
- `homeroom_teacher_id` (FK → User) — giáo viên chủ nhiệm

**Bảng `rooms`** — Phòng vật lý:
- `name`, `building`, `capacity` (default 40)
- `status` — Enum: `ACTIVE`, `INACTIVE`, `MAINTENANCE`

**Bảng `subjects`** — Môn học:
- `code` (unique), `name`
- `type` — Enum: `MANDATORY`, `ELECTIVE`, `OPTIONAL`
- `stream` — Enum: `NHAN_VAN`, `KHOA_HOC`, `UNKNOWN`
- `totalLessons` (nullable), `active` (Boolean)

**Bảng `combinations`** — Tổ hợp môn:
- `code`, `name`, `stream`
- `subjects` — `@ManyToMany` qua `combination_subjects`

**Bảng `lesson_slots`** — Tiết học trong ngày:
- `name` (e.g. "Tiết 1"), `startTime`, `endTime`
- `slotIndex` (thứ tự), `isMorning` (sáng/chiều)

**Bảng `class_enrollments`** — Học sinh đăng ký lớp:
- FK → Student, ClassRoom, AcademicYear
- Unique: `(student_id, classroom_id, academic_year_id)`

**Bảng `class_seat_maps`** — Sơ đồ chỗ ngồi:
- `config` (TEXT, JSON lưu cấu hình lưới và vị trí)
- Unique: `classroom_id` — mỗi lớp 1 sơ đồ

---

#### NHÓM 6 — Điểm danh

**Bảng `attendances`** — Bản ghi điểm danh từng học sinh:
- FK → Student, ClassRoom, Subject, Teacher
- `attendanceDate`, `slotIndex`
- `status` — Enum: `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`
- Unique: `(student_id, attendanceDate, slotIndex)`

**Bảng `attendance_sessions`** — Phiên điểm danh (sổ đầu bài):
- FK → School, ClassRoom, Teacher, Subject, AcademicYear, Semester
- `lessonContent` (TEXT) — nội dung bài học
- `homework` (TEXT), `note` (TEXT)

**Bảng `attendance_summary`** — Tổng hợp chuyên cần theo kỳ:
- `totalSessions`, `presentCount`, `absentCount`, `lateCount`, `excusedCount`
- `attendanceRate` (BigDecimal, precision 5.2, đơn vị %)
- Unique: `(student_id, class_id, academic_year_id, semester_id)`

**Bảng `daily_class_status`** — Trạng thái điểm danh theo ngày:
- `isFinalized` (Boolean) — xác nhận hoàn tất điểm danh trong ngày
- Unique: `(classroom_id, date)`

---

#### NHÓM 7 — Điểm số

**Bảng `grades`** — Bảng điểm tổng hợp:
- FK → Student, Subject, ClassRoom, Teacher, Semester
- `midtermScore`, `finalScore`, `averageScore` (BigDecimal, precision 4.2)
- `performanceCategory` (e.g. Giỏi, Khá, Trung bình)
- `regularScores` — `@OneToMany` → RegularScore (cascade all, orphan removal)
- Unique: `(student_id, subject_id, class_id, semester_id)`

**Bảng `regular_scores`** — Điểm thường xuyên:
- `scoreIndex` (thứ tự lần kiểm tra), `scoreValue`
- FK → Grade

**Bảng `scores`** — Điểm theo từng loại:
- `scoreType` — Enum: `ORAL`, `TEST_15MIN`, `TEST_45MIN`, `MIDTERM`, `FINAL`
- `value`, `scoreDate`, `note`
- FK → Student, Subject, AcademicYear, Semester, School

**Bảng `sub_grades`** — Điểm chi tiết phân loại:
- `category` — Enum: `ORAL`, `TEST_15MIN`
- `subIndex` (lần thứ mấy trong cùng loại)

**Bảng `grade_history`** — Lịch sử thay đổi điểm (audit trail):
- `fieldChanged`, `oldValue`, `newValue`
- FK → Grade, User (người thay đổi)
- `reason` (TEXT)

**Bảng `grade_types`** — Hệ số điểm:
- `typeCode` (e.g. "MIENG", "15_PHUT", "45_PHUT", "GIUA_KY", "CUOI_KY")
- `weight` (BigDecimal, precision 3.2) — hệ số nhân

**Bảng `grading_scales`** — Thang xếp loại:
- `minScore`, `maxScore`, `category` (e.g. GIOI, KHA, TRUNG_BINH, YEU, KEM)

---

#### NHÓM 8 — Thi cử

**Bảng `exam_sessions`** — Đợt thi:
- `name` (e.g. "Giữa kỳ 1"), `startDate`, `endDate`
- `type` — Enum: `MIDTERM`, `FINAL`
- `status` — Enum: `DRAFT`, `SCHEDULED`, `ONGOING`, `COMPLETED`
- FK → AcademicYear, Semester, School

**Bảng `exam_schedules`** — Lịch thi chi tiết:
- FK → ExamSession, ClassRoom, Subject, AcademicYear, Semester, School
- `grade` (10/11/12), `examDate`, `startTime`, `duration` (phút)
- `roomNumber`, `endTime`
- `status` — Enum: `UPCOMING`, `ONGOING`, `COMPLETED`, `POSTPONED`, `CANCELLED`

---

#### NHÓM 9 — Thời khoá biểu

**Bảng `timetables`** — Bản thời khoá biểu:
- `name` (e.g. "TKB Học kỳ 1 - Năm học 2025-2026 - Bản 1")
- `status` — Enum: `DRAFT`, `OFFICIAL`, `ARCHIVED`
- FK → Semester, School
- `timetableDetails` — `@OneToMany` với cascade và orphan removal

**Bảng `timetable_details`** — Chi tiết từng tiết trong TKB:
- FK → Timetable, ClassRoom, Subject, Teacher
- `dayOfWeek` — Enum: MONDAY ... SUNDAY
- `slotIndex` (1-10)
- `isFixed` (Boolean) — tiết cố định (e.g. chào cờ)
- 2 unique constraint:
  - `(timetable_id, classroom_id, day_of_week, slot_index)` — lớp không bị trùng tiết
  - `(timetable_id, teacher_id, day_of_week, slot_index)` — giáo viên không bị trùng tiết

**Bảng `school_timetable_settings`** — Cấu hình khung giờ:
- `periodsPerMorning` (default 5), `periodsPerAfternoon` (default 5)
- `periodDurationMinutes` (default 45)
- `morningStartTime` (default "07:00"), `afternoonStartTime` (default "13:00")
- `shortBreakMinutes` (default 5), `longBreakMinutes` (default 20)

---

#### NHÓM 10 — Thông báo

**Bảng `notifications`** — Thông báo toàn trường:
- `type` — Enum: `SYSTEM`, `ALERT`, `INFO`, `WARNING`
- `targetGroup` — Enum: `ALL`, `TEACHERS`, `STUDENTS`, `PARENTS`, `ADMINS`
- `status` — Enum: `ACTIVE`, `ARCHIVED`, `DELETED`

**Bảng `notification_recipients`** — Người nhận thông báo:
- Unique: `(notification_id, user_id)`, `isRead` (Boolean)

**Bảng `homeroom_notifications`** — Thông báo của giáo viên chủ nhiệm:
- `notificationType` — Enum: ANNOUNCEMENT, HOMEWORK, EVENT, v.v.
- `recipientType` — Enum: `STUDENTS`, `PARENTS`, `BOTH`
- `scheduledDate`, `scheduledTime` — hẹn lịch gửi

**Bảng `homeroom_notification_recipients`** — Người nhận thông báo CNH:
- `recipientRole` (STUDENT hoặc PARENT)
- `isRead`, `readAt`

**Bảng `device_tokens`** — FCM token cho push notification:
- PK là `fcmToken` (chính token Firebase)
- FK → User, `deviceType`

---

#### NHÓM 11 — Nhận diện khuôn mặt

**Bảng `facial_recognition_data`** — Dữ liệu khuôn mặt học sinh:
- Quan hệ 1-1 với Student
- `faceEncoding` (TEXT, JSON array of embeddings — dùng pgvector)
- `imageHash` (64 ký tự, unique) — tránh trùng ảnh
- `qualityScore` (BigDecimal, precision 3.2, 0-1) — chất lượng ảnh

**Bảng `facial_recognition_logs`** — Log mỗi lần nhận diện:
- `confidenceScore`, `processingTimeMs`
- `recognitionStatus` — SUCCESS, FAILED, LOW_CONFIDENCE, MULTIPLE_FACES, NO_FACE

---

#### NHÓM 12 — AI Chat & Đề xuất

**Bảng `chat_messages`** — Lịch sử chat với AI:
- `intent` — Enum: QUERY, HELP, FEEDBACK, COMPLAINT, v.v.
- `message` (TEXT), `response` (TEXT)

**Bảng `ml_models`** — Quản lý các model AI:
- `modelType` — RISK_PREDICTION, GRADE_PREDICTION, RECOMMENDATION, FACIAL_RECOGNITION
- `accuracy`, `precisionScore`, `recall`, `f1Score` (BigDecimal, precision 5.4)
- `isActive` (Boolean, chỉ 1 model active mỗi loại)

**Bảng `ai_recommendations`** — Đề xuất học tập từ AI:
- `recommendationType` — STUDY_TOPIC, LEARNING_RESOURCE, STUDY_SCHEDULE, PEER_GROUP, TUTORING
- `confidenceScore`, `priority`
- `isAccepted`, `isHelpful`, `feedbackText` — thu thập phản hồi

---

#### NHÓM 13 — Báo cáo & Phân tích

**Bảng `activity_logs`** — Audit log hành động người dùng:
- `action` (e.g. USER_CREATED, LOGIN_SUCCESS)
- `performed_by` (FK → User), `targetUserId`, `details` (TEXT/JSON)

**Bảng `learning_analytics`** — Phân tích học tập từng học sinh:
- `gradeTrend` — IMPROVING, STABLE, DECLINING
- `currentAverage`, `classAverage`, `performanceGap`, `classRank`
- `predictedFinalGrade`, `confidenceLevel`
- `strengths`, `weaknesses`, `recommendations` — `@ElementCollection`

**Bảng `risk_predictions`** — Dự báo rủi ro học sinh:
- `riskScore` (BigDecimal 0-1), `riskLevel` — LOW, MEDIUM, HIGH
- `factors` (JSON), `reasons`, `interventionRecommendations` — @ElementCollection
- `interventionStatus` — PENDING, IN_PROGRESS, COMPLETED, NO_ACTION
- `assigned_to` (FK → User — người phụ trách can thiệp)

---

#### NHÓM 14 — Đánh giá rủi ro (AI-driven)

**Bảng `risk_assessment_history`** — Lịch sử đánh giá rủi ro:
- `riskScore` (Integer 0-100)
- `riskCategory` — Enum: ATTENDANCE, ACADEMIC, CONDUCT, HEALTH, SOCIO_ECONOMIC
- `riskTrend` — IMPROVING, STABLE, DECLINING
- `aiReason` (200 ký tự) — giải thích từ AI
- `aiAdvice` (500 ký tự) — lời khuyên thân thiện cho học sinh
- `teacherFeedback` — Enum: PENDING, CONFIRMED, REJECTED

**Bảng `risk_metrics_snapshots`** — Snapshot chỉ số rủi ro:
- Lưu chỉ số 7 ngày và 30 ngày: vắng mặt, đi trễ, GPA, vi phạm kỷ luật
- `failingSubjectsCount`, `failingSubjectsDetail` (TEXT)
- Unique: `(student_id, snapshotDate)` — 1 snapshot/ngày/học sinh

---

#### NHÓM 15 — Dữ liệu địa lý

**Bảng `provinces`**: `code` (Integer PK), `name`, `codename`, `divisionType`, `phoneCode`

**Bảng `wards`**: `code` (Integer PK), `name`, `codename`, `divisionType`, `provinceCode` (FK → Province)

---

## PHẦN 2 — DB DIAGRAM (SƠ ĐỒ QUAN HỆ)

---

### 2.1 Trục trung tâm: School & User

Toàn bộ hệ thống xoay quanh 2 entity cốt lõi:

- **`School`** — mọi entity nghiệp vụ đều có `school_id`, đảm bảo cách ly dữ liệu giữa các trường (multi-tenant by school).
- **`User`** — tài khoản đăng nhập, liên kết 1-1 với Teacher hoặc Student, liên kết N-1 với Guardian.

---

### 2.2 Quan hệ chính giữa các nhóm

#### Trục học sinh — lớp — năm học

```
AcademicYear (1) ──< Semester (N)
AcademicYear (1) ──< ClassRoom (N)
ClassRoom (N) >──── Combination (1)
ClassRoom (N) >──── Room (1)
ClassRoom (N) >──── User [homeroom teacher] (1)
Student (N) >────── Guardian (1)
Student (N) >────── User (1-1)
Student (N) ──< ClassEnrollment >── ClassRoom (N) ── (qua AcademicYear)
```

#### Trục giảng dạy — thời khoá biểu

```
Teacher (N) ──── teacher_subjects ──── Subject (N)  [ManyToMany]
TeacherAssignment: Teacher — ClassRoom — Subject
Timetable (1) ──< TimetableDetail (N)
TimetableDetail: ClassRoom + Subject + Teacher + dayOfWeek + slotIndex
```

Ràng buộc đặc biệt trên `timetable_details`:
- Unique `(timetable_id, classroom_id, day_of_week, slot_index)` → lớp không dạy 2 tiết cùng lúc
- Unique `(timetable_id, teacher_id, day_of_week, slot_index)` → giáo viên không dạy 2 nơi cùng lúc

#### Trục điểm danh

```
AttendanceSession (1) ──< Attendance (N)
Attendance: Student + ClassRoom + Subject + Teacher + date + slotIndex
AttendanceSummary: tổng hợp Student + ClassRoom + AcademicYear + Semester
DailyClassStatus: ClassRoom + date → isFinalized
```

#### Trục điểm số

```
Grade: Student + Subject + ClassRoom + Teacher + Semester  [Unique]
Grade (1) ──< RegularScore (N)
GradeHistory: log mọi thay đổi của Grade
Score: điểm theo loại (ORAL, 15min, 45min, MIDTERM, FINAL)
SubGrade: điểm chi tiết theo category
```

#### Trục thi cử

```
ExamSession (1) ──< ExamSchedule (N)
ExamSchedule: ExamSession + ClassRoom + Subject + examDate + startTime
```

#### Trục AI & phân tích rủi ro

```
Student ──< RiskAssessmentHistory
Student ──< RiskMetricsSnapshot
Student ──< LearningAnalytics
Student ──< RiskPrediction
Student ──< AiRecommendation
MlModel (1) ──< RiskPrediction, LearningAnalytics, AiRecommendation
```

#### Trục nhận diện khuôn mặt

```
Student (1) ── FacialRecognitionData (1-1)
FacialRecognitionData ── faceEncoding [pgvector embeddings]
Attendance <── FacialRecognitionLog
```

#### Trục thông báo

```
Notification (1) ──< NotificationRecipient (N) → User
HomeroomNotification (1) ──< HomeroomNotificationRecipient (N) → User
User ──< DeviceToken (FCM push notification)
```

---

### 2.3 Các bảng trung gian (Join tables)

| Bảng trung gian | Quan hệ |
|---|---|
| `teacher_subjects` | Teacher ↔ Subject (ManyToMany) |
| `combination_subjects` | Combination ↔ Subject (ManyToMany) |
| `class_enrollments` | Student ↔ ClassRoom (qua AcademicYear) |
| `notification_recipients` | Notification ↔ User |
| `homeroom_notification_recipients` | HomeroomNotification ↔ User |

---

### 2.4 Soft delete pattern

Các entity quan trọng dùng `pendingDeleteAt` (Instant, nullable) thay vì xoá cứng:
- `User` — `pendingDeleteAt`, `wasEnabledBeforePendingDelete`
- `School` — `pendingDeleteAt`

---

### 2.5 Audit trail pattern

Ba bảng được thiết kế riêng để theo vết thay đổi:
- `activity_logs` — log hành động của mọi người dùng
- `grade_history` — log từng lần sửa điểm (fieldChanged, oldValue, newValue, reason)
- `risk_assessment_history` — lịch sử đánh giá rủi ro học sinh

---

## PHẦN 3 — TESTING

---

### 3.1 Thực trạng test hiện tại

File test duy nhất trong dự án:

**`backend/src/test/java/com/schoolmanagement/backend/IssApplicationTests.java`**

```java
@SpringBootTest
class IssApplicationTests {
    @Test
    void contextLoads() {
    }
}
```

Đây là **smoke test** cơ bản nhất của Spring Boot — kiểm tra rằng toàn bộ Spring Application Context khởi động thành công, tức là:
- Tất cả bean được khởi tạo không có lỗi
- Tất cả cấu hình (`@Configuration`) và kết nối database không ném exception khi startup
- Các dependency injection không có vòng lặp circular

---

### 3.2 Ý nghĩa của `contextLoads()`

Tuy đơn giản, test này có giá trị thực tế:

1. **Phát hiện cấu hình sai** — nếu datasource URL sai, bean thiếu, property bị lỗi → test fail ngay khi chạy build
2. **Tích hợp CI/CD** — đây là test được chạy tự động mỗi lần build Maven (`mvn test`)
3. **Baseline test** — là điểm xuất phát trước khi mở rộng test suite

---

### 3.3 Phạm vi kiểm thử thực tế của dự án

Ngoài unit/integration test tự động, nhóm thực hiện kiểm thử thủ công qua:

1. **API Testing với Postman/REST client** — kiểm tra từng endpoint controller
2. **Docker Compose environment** — chạy toàn bộ stack (DB + backend + frontend + face service) để test end-to-end
3. **pgAdmin** — kiểm tra trực tiếp data trong database sau mỗi thao tác
4. **Frontend UI** — test luồng người dùng trực tiếp trên giao diện React

---

### 3.4 Phân tích rủi ro từ coverage hiện tại

| Module | Độ phức tạp | Rủi ro nếu thiếu test |
|---|---|---|
| Tính điểm trung bình, xếp loại | Cao | Tính sai → ảnh hưởng kết quả học sinh |
| Unique constraint TKB | Cao | Giáo viên / lớp bị trùng tiết |
| Soft delete User/School | Trung bình | Xoá nhầm, mất dữ liệu |
| OTP auth challenge | Cao | Lỗ hổng bảo mật xác thực |
| AttendanceSummary tổng hợp | Trung bình | Số liệu điểm danh không chính xác |
| Risk score AI pipeline | Cao | Đánh giá sai rủi ro học sinh |

---

### 3.5 Kết luận phần Testing

Dự án hiện có **1 test tự động** (context loading). Toàn bộ kiểm thử tính năng được thực hiện thủ công trong quá trình phát triển. Đây là thực tế phổ biến ở các dự án học thuật có timeframe ngắn. Nếu dự án chuyển sang production, ưu tiên bổ sung test cho 3 module có độ rủi ro cao nhất: tính điểm, xếp lịch TKB, và xác thực OTP.

---

*End of script*
