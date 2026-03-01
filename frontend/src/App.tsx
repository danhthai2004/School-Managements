import AppRouter from "./routes/AppRouter";
import ChatbotUI from "./components/chatbot/ChatbotUI";

export default function App() {
  return (
    <>
      <AppRouter />
      <ChatbotUI />
    </>
  );
}
