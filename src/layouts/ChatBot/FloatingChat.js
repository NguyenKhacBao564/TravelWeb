import React, { useState } from "react";
import { GoCommentDiscussion } from "react-icons/go";
import  ChatBox from "./ChatBox"; // Import component Messages của bạn
import { MdCancel } from "react-icons/md";
import "./ChatBot.scss";

const FloatingChatButton = () => {
    const [isOpen, setIsOpen] = useState(false);
  
    return (
      <div className="chat-container">
        {isOpen && (
            <div style={{ position: "fixed", bottom: 0, right: 0, zIndex: 1000 }}>
                <ChatBox />
                <button onClick={() => setIsOpen(!isOpen)} className="chat-button canncel-button">
                    <MdCancel size={24} />
                </button>
            </div>
        )}
        {!isOpen &&
        <button onClick={() => setIsOpen(!isOpen)} className="chat-button">
             <GoCommentDiscussion size={24} />
        </button>}
      </div>
    );
  };
  
  export default FloatingChatButton;