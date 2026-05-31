import axios from "axios";
import { API_URL } from "../utils/API_Port";

// Send a chat message to the Express chatbot endpoint.
// Returns the raw response payload from the backend (which may include
// status, message, tourlist, missing_fields, fallback_used, search_metadata, ...).
export const sendChatbotMessage = async ({ query, userId }) => {
  try {
    const response = await axios.post(`${API_URL}/chat/chatbot`, {
      query,
      user_id: userId,
    });
    return response.data || {};
  } catch (error) {
    // Surface backend payload when present (e.g. structured fallback),
    // otherwise re-throw a clean error for the UI to handle.
    if (error.response?.data) {
      return error.response.data;
    }
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Không thể kết nối tới trợ lý ảo."
    );
  }
};

// Lightweight health probe against the Express chatbot route.
export const checkChatbotHealth = async () => {
  try {
    const response = await axios.get(`${API_URL}/chat/health`);
    return response.data;
  } catch (error) {
    return { status: "down", error: error.message };
  }
};
