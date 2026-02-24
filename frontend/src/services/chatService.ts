import api from "./api";

export interface ChatResponse {
    answer: string;
    intent: string;
    status: "OK" | "NEED_CLARIFICATION" | "DENIED";
    studentOptions: string[] | null;
}

export const chatService = {
    /**
     * Gửi tin nhắn chat đến backend chatbot.
     */
    sendMessage: async (message: string): Promise<ChatResponse> => {
        const res = await api.post<ChatResponse>("/chat", { message });
        return res.data;
    },
};
