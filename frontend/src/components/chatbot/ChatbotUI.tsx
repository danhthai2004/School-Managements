import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { chatService, type ChatResponse } from "../../services/chatService";
import { useAuth } from "../../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatbotUI.css";

interface Message {
    id: number;
    text: string;
    sender: "user" | "bot";
    isError?: boolean;
    studentOptions?: string[];
    isTyping?: boolean;
}

function getWelcomeMsg(role: string | null): string {
    let msg = "Xin chào! 👋 Tôi là trợ lý ảo của hệ thống trường học.\n\nBạn có thể hỏi tôi về:\n";
    switch (role) {
        case "STUDENT":
            msg += "📊 Điểm số, kết quả học tập\n📅 Thời khóa biểu, lịch học\n✅ Điểm danh, vắng mặt\n📢 Thông báo nhà trường";
            break;
        case "GUARDIAN":
            msg += "📊 Điểm số của con\n📅 Lịch học của con\n✅ Tình hình điểm danh\n📢 Thông báo nhà trường";
            break;
        case "TEACHER":
            msg += "📅 Lịch giảng dạy\n📢 Thông báo nhà trường";
            break;
        case "SCHOOL_ADMIN":
            msg += "📈 Thống kê tổng quan\n📊 Số liệu học sinh, giáo viên\n📢 Quản lý chung";
            break;
        default:
            msg += "📢 Các thông tin chung của trường";
    }
    return msg;
}

function getQuickReplies(role: string | null) {
    switch (role) {
        case "STUDENT":
            return [
                { label: "Lịch học hôm nay", text: "Hôm nay em học môn gì?" },
                { label: "Xem điểm", text: "Cho em xem bảng điểm" },
                { label: "Điểm danh", text: "Hôm nay em điểm danh thế nào?" },
                { label: "Thông báo", text: "Có thông báo mới không?" },
            ];
        case "GUARDIAN":
            return [
                { label: "Lịch học hôm nay", text: "Hôm nay con tôi học môn gì?" },
                { label: "Xem điểm", text: "Cho tôi xem bảng điểm của con" },
                { label: "Điểm danh", text: "Hôm nay con tôi điểm danh thế nào?" },
                { label: "Thông báo", text: "Có thông báo mới không?" },
            ];
        case "TEACHER":
            return [
                { label: "Lịch dạy hôm nay", text: "Hôm nay tôi dạy lớp nào?" },
                { label: "Lịch dạy tuần này", text: "Thời khóa biểu tuần này của tôi" },
                { label: "Thông báo", text: "Có thông báo mới không?" },
            ];
        case "SCHOOL_ADMIN":
            return [
                { label: "Thống kê trường", text: "Trường có bao nhiêu học sinh?" },
                { label: "Thông báo", text: "Có thông báo mới không?" },
            ];
        default:
            return [
                { label: "Hướng dẫn", text: "Bạn có thể giúp tôi những gì?" }
            ];
    }
}

// --- Typing Effect Component ---
function TypingEffect({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayed, setDisplayed] = useState("");
    const idx = useRef(0);
    useEffect(() => {
        idx.current = 0;
        setDisplayed("");
        const interval = setInterval(() => {
            idx.current++;
            setDisplayed(text.slice(0, idx.current));
            if (idx.current >= text.length) {
                clearInterval(interval);
                onComplete?.();
            }
        }, 12); // 12ms per character
        return () => clearInterval(interval);
    }, [text]);
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayed}</ReactMarkdown>;
}

export default function ChatbotUI() {
    const { user } = useAuth();
    const userRole = user?.role || null;
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, text: getWelcomeMsg(userRole), sender: "bot" },
    ]);

    // Update welcome message when user role is loaded
    useEffect(() => {
        setMessages((prev) => {
            if (prev.length > 0 && prev[0].id === 0 && prev[0].text !== getWelcomeMsg(userRole)) {
                const newMessages = [...prev];
                newMessages[0] = { ...newMessages[0], text: getWelcomeMsg(userRole) };
                return newMessages;
            }
            return prev;
        });
    }, [userRole]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const idCounter = useRef(1);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const addMessage = useCallback(
        (text: string, sender: "user" | "bot", extra?: Partial<Message>) => {
            const msg: Message = { id: idCounter.current++, text, sender, ...extra };
            setMessages((prev) => [...prev, msg]);
            return msg;
        },
        []
    );

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        addMessage(trimmed, "user");
        setInput("");
        setIsLoading(true);

        try {
            const response: ChatResponse = await chatService.sendMessage(trimmed);

            if (response.status === "NEED_CLARIFICATION" && response.studentOptions) {
                addMessage(response.answer, "bot", {
                    studentOptions: response.studentOptions,
                });
            } else {
                addMessage(response.answer, "bot", { isTyping: true });
            }
        } catch (err: unknown) {
            const errorMsg =
                err instanceof Error ? err.message : "Lỗi kết nối đến server.";
            addMessage(
                `Xin lỗi, đã xảy ra lỗi: ${errorMsg}\nVui lòng thử lại sau.`,
                "bot",
                { isError: true }
            );
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, addMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleOptionClick = (studentName: string) => {
        setInput(`Điểm của ${studentName}`);
        setTimeout(() => {
            handleSend();
        }, 100);
    };

    return (
        <>
            {/* Toggle button */}
            <button
                className={`chatbot-toggle ${isOpen ? "active" : ""}`}
                onClick={() => setIsOpen(!isOpen)}
                title={isOpen ? "Đóng chat" : "Mở trợ lý ảo"}
                id="chatbot-toggle-btn"
            >
                {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
            </button>

            {/* Chat window */}
            {isOpen && (
                <div className="chatbot-window" id="chatbot-window">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-icon">🤖</div>
                        <div className="chatbot-header-info">
                            <h3>Trợ lý ảo ISS</h3>
                            <p>Hỏi đáp về trường học</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages" id="chatbot-messages">
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <div
                                    className={`chatbot-msg ${msg.sender}${msg.isError ? " error" : ""
                                        }`}
                                >
                                    {msg.sender === "bot" && msg.isTyping ? (
                                        <TypingEffect
                                            text={msg.text}
                                            onComplete={() =>
                                                setMessages((prev) =>
                                                    prev.map((m) =>
                                                        m.id === msg.id
                                                            ? { ...m, isTyping: false }
                                                            : m
                                                    )
                                                )
                                            }
                                        />
                                    ) : (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}
                                </div>
                                {msg.studentOptions && (
                                    <div className="chatbot-options">
                                        {msg.studentOptions.map((name) => (
                                            <button
                                                key={name}
                                                className="chatbot-option-btn"
                                                onClick={() => handleOptionClick(name)}
                                            >
                                                👤 {name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chatbot-typing">
                                <span />
                                <span />
                                <span />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {messages.length <= 1 && !isLoading && (
                        <div className="chatbot-quick-replies">
                            {getQuickReplies(userRole).map((qr) => (
                                <button
                                    key={qr.label}
                                    className="chatbot-quick-btn"
                                    onClick={() => {
                                        setInput(qr.text);
                                        setTimeout(() => {
                                            addMessage(qr.text, "user");
                                            setInput("");
                                            setIsLoading(true);
                                            chatService.sendMessage(qr.text).then((res) => {
                                                addMessage(res.answer, "bot", { isTyping: true });
                                            }).catch((err: unknown) => {
                                                const errorMsg = err instanceof Error ? err.message : "Lỗi kết nối đến server.";
                                                addMessage(`Xin lỗi, đã xảy ra lỗi: ${errorMsg}`, "bot", { isError: true });
                                            }).finally(() => setIsLoading(false));
                                        }, 50);
                                    }}
                                >
                                    {qr.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="chatbot-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            className="chatbot-input"
                            placeholder="Nhập câu hỏi..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            maxLength={1000}
                            id="chatbot-input"
                        />
                        <button
                            className="chatbot-send"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            title="Gửi"
                            id="chatbot-send-btn"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
