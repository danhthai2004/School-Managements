package com.schoolmanagement.backend.domain;

/**
 * Enum phân loại ý định (intent) của câu hỏi người dùng trong chatbot.
 * AI Intent Classifier sẽ phân loại câu hỏi vào MỘT trong các mã dưới đây.
 */
public enum ChatIntent {

    /** Hỏi về điểm số, kết quả học tập */
    ASK_SCORE,

    /** Hỏi về thời khóa biểu, lịch học */
    ASK_TIMETABLE,

    /** Hỏi về điểm danh, nghỉ phép, vắng mặt */
    ASK_ABSENCE,

    /** Hỏi về thông báo của nhà trường */
    ASK_ANNOUNCEMENT,

    /** GV hỏi lịch dạy cá nhân */
    ASK_TEACHER_TIMETABLE,

    /** GV hỏi thông tin lớp chủ nhiệm (sĩ số, vắng hôm nay) */
    ASK_HOMEROOM_CLASS,

    /** Admin hỏi thống kê nhanh toàn trường */
    ASK_QUICK_STATS,

    /** Yêu cầu hành động (xóa, sửa, thêm dữ liệu) — KHÔNG HỖ TRỢ */
    UNSUPPORTED_ACTION,

    /** Câu hỏi ngoài phạm vi hệ thống (học phí, tài chính, v.v.) */
    OUT_OF_SCOPE,

    /** Không thể phân loại được */
    UNKNOWN
}
