import axios from "axios";

import { API_URL } from "../utils/API_Port";

export const createSupportRequest = async (supportData) => {
    try {
        const response = await axios.post(`${API_URL}/api/customer/support/request`, supportData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Lỗi khi gửi yêu cầu hỗ trợ" };
    }
};