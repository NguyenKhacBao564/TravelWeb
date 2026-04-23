import axios from "axios";
import { API_URL } from "../utils/API_Port";

export const getFavoriteTours = async (id) => {
    console.log("Fetching favorite tours for user ID:", id);
    try {
        const response = await axios.get(`${API_URL}/favoriteTours/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Lỗi khi lấy danh sách tour yêu thích");
    }
}


export const addFavoriteTour = async (fav_id, cusId, tourId) => {
    try{
        console.log("Adding favorite tour:", fav_id, cusId, tourId);
        const response = await axios.post(`${API_URL}/favoriteTours/addFavoriteTour`, {
            fav_id,
            cusId,
            tourId
        });
        return response.data;
    }catch(error){
        throw new Error(error.response?.data?.message || "Lỗi khi thêm tour vào danh sách yêu thích");
    }
}


export const deleteFavoriteTour = async (fav_id) => {
    try {
        const response = await axios.delete(`${API_URL}/favoriteTours/delete/${fav_id}`, {
            withCredentials: true // Đảm bảo gửi cookie
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Lỗi khi xóa tour khỏi danh sách yêu thích");
    }
}