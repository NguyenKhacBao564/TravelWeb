import axios from "axios";
import { API_URL } from "../utils/API_Port";

export const getItinerary = async (tour_id) => {
    try {
        const response = await axios.get(`${API_URL}/schedule/${tour_id}`);
        return response.data;   
    } catch (error) {
        throw new Error(error.response?.data?.message || "Lỗi khi lấy lịch trình");
    }
}
