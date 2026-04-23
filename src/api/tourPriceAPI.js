import axios from "axios";
import { API_URL } from "../utils/API_Port";

export const getTourPrice = async (tour_id) => {
    try{
        const response = await axios.get(`${API_URL}/tour-price/${tour_id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Lỗi khi lấy giá tour");
    }
}


