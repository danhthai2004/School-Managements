import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { chatService, type ChatResponse } from "../../services/chatService";
import "./ChatbotUI.css";

interface Message {
    id: number;
    text: string;
    sender: "user" | "bot";
    isError?: boolean;
    studentOptions?: string[];
}

const WELCOME_MSG =
    "Xin chào! 👋 Tôi là trợ lý ảo của hệ thống trường học.\n\n" +
    "Bạn có thể hỏi tôi về:\n" +
    "📊 Điểm số, kết quả học tập\n" +
    "📅 Thời khóa biểu, lịch học\n" +
    "✅ Điểm danh, vắng mặt\n" +
    "📢 Thông báo nhà trường";

export default function ChatbotUI() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, text: WELCOME_MSG, sender: "bot" },
    ]);
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
                addMessage(response.answer, "bot");
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
                                    {msg.text}
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
