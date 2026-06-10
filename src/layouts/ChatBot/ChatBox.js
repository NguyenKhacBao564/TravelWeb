import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { GoDependabot } from "react-icons/go";
import {
  IoClose,
  IoPaperPlane,
  IoRefresh,
  IoSparkles,
  IoTrashOutline,
} from "react-icons/io5";
import { sendChatbotMessage } from "../../api/chatbotAPI";
import "./ChatBot.scss";

const CHAT_USER_ID_STORAGE_KEY = "tourguide_chat_user_id";
const CHAT_SESSION_ID_STORAGE_KEY = "tourguide_chat_session_id";

const SUGGESTED_PROMPTS = [
  "Tìm tour Đà Lạt tháng 6 dưới 5 triệu",
  "Tour Phú Yên còn chỗ không?",
  "TourGuide hỗ trợ thanh toán gì?",
];

const GREETINGS = [
  "xin chào",
  "chào",
  "hello",
  "hi",
  "chào bạn",
  "chào bạn nhé",
];

const createChatUserId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `web_${crypto.randomUUID()}`;
  }
  return `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getOrCreateChatUserId = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return createChatUserId();
  }
  try {
    const existingUserId = window.localStorage.getItem(CHAT_USER_ID_STORAGE_KEY);
    if (existingUserId) {
      return existingUserId;
    }
    const newUserId = createChatUserId();
    window.localStorage.setItem(CHAT_USER_ID_STORAGE_KEY, newUserId);
    return newUserId;
  } catch {
    return createChatUserId();
  }
};

const getOrCreateChatSessionId = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return undefined;
  }
  try {
    const existing = window.localStorage.getItem(CHAT_SESSION_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    // No session yet — will be created on first response
    return undefined;
  } catch {
    return undefined;
  }
};

const setChatSessionId = (sessionId) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    if (sessionId) {
      window.localStorage.setItem(CHAT_SESSION_ID_STORAGE_KEY, sessionId);
    } else {
      window.localStorage.removeItem(CHAT_SESSION_ID_STORAGE_KEY);
    }
  } catch {
    // Swallow — storage errors must not break chat
  }
};

const clearChatSessionId = () => {
  setChatSessionId(null);
};

const formatDate = (dateStr) => {
  if (!dateStr) {
    return "Đang cập nhật";
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return "Đang cập nhật";
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatPrice = (value) => {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "Liên hệ";
  }

  return `${numericValue.toLocaleString("vi-VN")} đ`;
};

const MISSING_FIELD_HINTS = {
  time: "Bạn muốn đi vào thời gian nào?",
  date: "Bạn muốn đi vào thời gian nào?",
  start_date: "Bạn muốn đi vào thời gian nào?",
  price: "Ngân sách dự kiến của bạn là bao nhiêu?",
  budget: "Ngân sách dự kiến của bạn là bao nhiêu?",
  destination: "Bạn muốn đi đến đâu?",
  location: "Bạn muốn đi đến đâu?",
};

const buildMissingInfoText = (data) => {
  const missing = Array.isArray(data.missing_fields) ? data.missing_fields : [];
  const hints = missing
    .map((field) => MISSING_FIELD_HINTS[String(field).toLowerCase()])
    .filter(Boolean);

  if (hints.length === 0) {
    return (
      data.message ||
      "Bạn có thể cho mình biết thêm thông tin để gợi ý tour phù hợp hơn không?"
    );
  }

  const base =
    data.message ||
    "Mình cần thêm vài thông tin để gợi ý tour phù hợp hơn:";
  return `${base}\n\n- ${hints.join("\n- ")}`;
};

const buildBotText = (data, originalInput) => {
  const normalizedInput = originalInput.trim().toLowerCase();

  if (GREETINGS.includes(normalizedInput)) {
    return "Xin chào! Tôi là trợ lý ảo của TourGuide. Bạn cần hỗ trợ tìm tour hay thông tin đặt chuyến?";
  }

  if (data.status === "missing_info") {
    return buildMissingInfoText(data);
  }

  return (
    data.message ||
    data.response ||
    "Xin lỗi, tôi chưa thể phản hồi lúc này."
  );
};

const ChatTourList = ({ tours }) => {
  if (!Array.isArray(tours) || tours.length === 0) {
    return null;
  }

  return (
    <div className="chatTours">
      {tours.slice(0, 3).map((tour) => (
        <a
          href={`/booking?id=${tour.tour_id}`}
          className="chatTourCard"
          key={tour.tour_id}
        >
          <div className="chatTourCard__title">{tour.name}</div>
          <div className="chatTourCard__meta">
            <span>{tour.destination}</span>
            <span>{formatDate(tour.start_date)}</span>
          </div>
          <div className="chatTourCard__footer">
            <strong>{formatPrice(tour.price ?? tour.prices)}</strong>
            <span>Xem tour</span>
          </div>
        </a>
      ))}
      {tours.length > 3 && (
        <div className="chatTourMore">Còn {tours.length - 3} tour phù hợp khác</div>
      )}
    </div>
  );
};

const ChatBox = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Xin chào, tôi có thể giúp bạn tìm tour theo điểm đến, thời gian và ngân sách.",
      status: "welcome",
      tours: [],
    },
  ]);
  const [chatUserId] = useState(getOrCreateChatUserId);
  const [sessionId, setSessionId] = useState(getOrCreateChatSessionId);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const canSend = input.trim().length > 0 && !isLoading;

  const sendMessage = async (messageText = input) => {
    const trimmedInput = messageText.trim();
    if (!trimmedInput || isLoading) {
      return;
    }

    const userMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: trimmedInput,
      tours: [],
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await sendChatbotMessage({
        query: trimmedInput,
        userId: chatUserId,
        sessionId,
      });

      // Store session_id from response for subsequent requests
      if (data.session_id) {
        const newSessionId = data.session_id;
        setSessionId(newSessionId);
        setChatSessionId(newSessionId);
      }

      const tourlist = Array.isArray(data.tourlist) ? data.tourlist : [];

      const botMessage = {
        id: `bot_${Date.now()}`,
        role: "bot",
        text: buildBotText(data, trimmedInput),
        status: data.status,
        fallbackUsed: Boolean(data.fallback_used),
        tours: tourlist,
      };

      setMessages((currentMessages) => [...currentMessages, botMessage]);
    } catch (error) {
      console.error("Lỗi khi gọi API:", error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `error_${Date.now()}`,
          role: "bot",
          text: "Xin lỗi, hiện tại hệ thống chat đang bận. Bạn vui lòng thử lại sau.",
          status: "error",
          tours: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    clearChatSessionId();
    setSessionId(undefined);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <section className="chatBox" aria-label="TourGuide chatbot">
      <header className="chatHeader">
        <div className="chatHeader__brand">
          <div className="chatHeader__logo">
            <img src="logo.png" alt="TourGuide" />
          </div>
          <div>
            <h2>Tour Guide Supporter</h2>
            <p>Trợ lý tìm tour</p>
          </div>
        </div>
        <div className="chatHeader__actions">
          <button
            type="button"
            className="chatIconButton"
            onClick={handleClearChat}
            title="Xóa hội thoại"
            aria-label="Xóa hội thoại"
          >
            <IoTrashOutline />
          </button>
          <button
            type="button"
            className="chatIconButton"
            onClick={onClose}
            title="Đóng chat"
            aria-label="Đóng chat"
          >
            <IoClose />
          </button>
        </div>
      </header>

      <div className="Message-area">
        {messages.length === 0 && (
          <div className="chatEmptyState">
            <IoSparkles />
            <p>Bạn muốn đi đâu trong chuyến tiếp theo?</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`respond ${message.role === "user" ? "user" : "bot"}`}
          >
            {message.role === "bot" && (
              <div className="ChatBot-icon" aria-hidden="true">
                <GoDependabot />
              </div>
            )}
            <div className="chatmess">
              <ReactMarkdown
                skipHtml={true}
                disallowedElements={["script"]}
                unwrapDisallowed={true}
              >
                {message.text}
              </ReactMarkdown>
              {message.role === "bot" && <ChatTourList tours={message.tours} />}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="respond bot loading">
            <div className="ChatBot-icon" aria-hidden="true">
              <GoDependabot />
            </div>
            <div className="chatmess typingBubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div className="chatSuggestions">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              type="button"
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        className="chatInput"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu hỏi..."
          rows={1}
          disabled={isLoading}
        />
        <button type="submit" disabled={!canSend} aria-label="Gửi tin nhắn">
          {isLoading ? <IoRefresh className="chatSpin" /> : <IoPaperPlane />}
        </button>
      </form>
    </section>
  );
};

export default ChatBox;
