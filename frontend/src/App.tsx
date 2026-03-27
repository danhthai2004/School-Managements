import AppRouter from "./routes/AppRouter";
import { ToastProvider } from "./context/ToastContext";
import { SemesterProvider } from "./context/SemesterContext";
import { useAuth } from "./context/AuthContext";
import ChatbotUI from "./components/chatbot/ChatbotUI";

export default function App() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <SemesterProvider>
        <AppRouter />
        {/* Hiện chatbot cho tất cả user đã đăng nhập */}
        {user && <ChatbotUI />}
      </SemesterProvider>
    </ToastProvider>
  );
}
