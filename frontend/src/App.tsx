import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext";
import ChatbotUI from "./components/chatbot/ChatbotUI";

export default function App() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <AppRouter />
      {/* Hiện chatbot cho tất cả user đã đăng nhập */}
      {user && <ChatbotUI />}
    </ToastProvider>
  );
}
