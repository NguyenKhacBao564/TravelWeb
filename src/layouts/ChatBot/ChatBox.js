import React, { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
// import Message from "../components/Message";
import ReactMarkdown from "react-markdown";
import { GoDependabot } from "react-icons/go";
import { FcBusinessman } from "react-icons/fc";
import axios from "axios";
import "./ChatBot.scss";
import Card from 'react-bootstrap/Card';
import Placeholder from 'react-bootstrap/Placeholder';


const ChatBox = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const tour_info = (tourlist) => {
    let tour_infor_form = "";
    tourlist.forEach((tour, index) => {
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
      };
      tour_infor_form = tour_infor_form + `\n\n### ${index + 1}.` + tour.name +
        `\n\n**Ngày khởi hành:** ${formatDate(tour.start_date)}` +
        `\n\n**Ngày kết thúc:** ${formatDate(tour.end_date)}` +
        '\n\n**Thời gian:** ' + tour.duration + " ngày" +
        '\n\n**Điểm đến:** ' + tour.destination +
        '\n\n**Giá:** ' + tour.prices + " VNĐ" +
        '\n\n'
    })
    return tour_infor_form;
  }
  const sendMessage = async () => {
    setIsLoading(true);
    if (!input) return;

    const newMessages = [...messages, { user: input }];
    setMessages(newMessages);
    setInput("");
    try {
      // Gửi câu hỏi đến backend
      const response = await axios.post('http://localhost:3001/chat/chatbot', { query: input });
      var botMessage = response.data.response;

      // console.log("response:", response.data);
      if (response.data?.tourlist) {
        const tourlist = response.data.tourlist;
        console.log("tourlist: ", tourlist);
        botMessage += tour_info(tourlist);
      }

      const greetings = ["Xin chào", "xin chào", "Chào", "Hello", "Hi", "Chào bạn", "Chào bạn nhé"];

      if (greetings.includes(input.trim())) {
        botMessage = "Xin chào! Tôi là trợ lý ảo của công ty du lịch TourGuide. Bạn cần hỗ trợ gì?";
      }


      // console.log("response:", response.data);
      setMessages([...newMessages, { bot: botMessage }]);
      setInput("");
      setIsLoading(false);
      // setTimeout(() => {
      //   setIsLoading(false);
      // }, 3000); // Giả lập thời gian phản hồi của bot
      console.log([...newMessages, { bot: botMessage }]);
    } catch (error) {

      console.error("Lỗi khi gọi API:", error);
    }
  };
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chatBox" >
      <h2 className="chatTitle"><img src="logo.png" ></img>Tour Guide Supporter</h2>
      <div className="Message-area">
        {messages.map((msg, index) => (
          <div key={index} className={`respond ${msg.user ? "user" : "bot"}`}>
            {msg.bot && <GoDependabot className="ChatBot-icon" />}
            <div className="chatmess">
              {msg.user ? msg.user : (
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p style={{ margin: "5px 0", textAlign: "left", width: "100%", color: "black" }} {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li style={{ marginBottom: "5px" }} {...props} />
                    ),
                  }}
                  skipHtml={true}
                  disallowedElements={["script"]}
                  unwrapDisallowed={true}
                >
                  {msg.bot}

                </ReactMarkdown>
              )}
            </div>

          </div>
        ))}
        {/* phần tử đánh dấu để scroll tới */}
        {isLoading && (
          <div className="respond bot" style={{ width: "100%" }}>
            <GoDependabot className="ChatBot-icon" />
            <div className="chatmess" style={{ width: "100%" }}>
              <Placeholder as={Card.Text} animation="glow">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatInput">
        <input
          style={{ width: "80%" }}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi..."
        />
        <button onClick={sendMessage}>Gửi</button>
      </div>
    </div>
  );
};

export default ChatBox;
