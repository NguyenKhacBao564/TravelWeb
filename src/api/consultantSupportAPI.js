import axios from "axios";
import { API_URL } from "../utils/API_Port";

// Lấy danh sách yêu cầu hỗ trợ
export const fetchSupportRequests = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/consultant/support/consultant/requests`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Lỗi khi lấy danh sách yêu cầu hỗ trợ" };
    }
};

// Cập nhật trạng thái yêu cầu hỗ trợ
export const updateRequestStatus = async (requestId, status) => {
    try {
        const response = await axios.put(`${API_URL}/api/consultant/support/consultant/request/${requestId}/status`, {
            status,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Lỗi khi cập nhật trạng thái yêu cầu" };
    }
};

// Gửi phản hồi cho yêu cầu hỗ trợ
export const sendResponse = async (responseData) => {
    try {
        // Kiểm tra dữ liệu đầu vào
        const requiredFields = ['response_id', 'request_id', 'emp_id', 're_message', 'customer_email'];
        const missingFields = requiredFields.filter(field => !responseData[field]);
        if (missingFields.length > 0) {
            throw new Error(`Thiếu các trường bắt buộc: ${missingFields.join(', ')}`);
        }

        const response = await axios.post(`${API_URL}/api/consultant/support/consultant/response`, responseData);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: "Lỗi khi gửi phản hồi" };
    }
};