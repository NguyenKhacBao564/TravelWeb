import axios from "axios";

import { API_URL } from "../utils/API_Port";

export const getEmployeeAccount = async () => {
    try {
        const response = await axios.get(`${API_URL}/employees`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Lỗi khi lấy thông tin nhân viên" };
    }
};