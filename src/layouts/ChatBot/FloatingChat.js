import React, { useState } from "react";
import { IoChatbubbleEllipses } from "react-icons/io5";
import ChatBox from "./ChatBox";
import "./ChatBot.scss";

const FloatingChatButton = () => {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <div className="chat-container">
        {isOpen && (
            <ChatBox onClose={() => setIsOpen(false)} />
        )}
        {!isOpen &&
        <button
          onClick={() => setIsOpen(true)}
          className="chat-button"
          aria-label="Mở chatbot"
          title="Mở chatbot"
        >
             <IoChatbubbleEllipses size={26} />
        </button>}
      </div>
    );
  };
  
  export default FloatingChatButton;
