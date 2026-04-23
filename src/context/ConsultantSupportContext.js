import React, { createContext, useState, useContext, useCallback } from "react";
import {
    fetchSupportRequests,
    sendResponse,
} from "../api/consultantSupportAPI";
import { v4 as uuidv4 } from 'uuid'; // Thêm thư viện uuid để tạo response_id

const ConsultantSupportContext = createContext();

export const ConsultantSupportProvider = ({ children }) => {
    const [supportRequests, setSupportRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Lấy danh sách yêu cầu hỗ trợ
    const handleFetchSupportRequests = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchSupportRequests();
            setSupportRequests(data);
            setError(null);
        } catch (err) {
            setError(err.message || "Không thể lấy danh sách yêu cầu hỗ trợ. Vui lòng thử lại.");
            console.error("Lỗi khi lấy danh sách yêu cầu hỗ trợ:", err);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array since this function doesn't depend on any props or state

    // Gửi phản hồi cho yêu cầu hỗ trợ và lưu vào bảng Customer_Support_Response
    const handleSendResponse = async (responseDataFromFrontend) => {
        try {
            // Kiểm tra dữ liệu đầu vào từ đối tượng nhận được
            const { request_id, emp_id, re_message } = responseDataFromFrontend;
            if (!request_id || !emp_id || !re_message) {
                throw new Error("Thiếu thông tin: request_id, emp_id, hoặc re_message");
            }

            // Tạo response_id duy nhất (có thể tạo ở backend nếu muốn, nhưng giữ ở đây cũng được)
            const responseId = `RES${uuidv4().replace(/-/g, '').slice(0, 15)}`;

            // Tạo payload đầy đủ để gửi đến backend API
            const payload = {
                ...responseDataFromFrontend,
                response_id: responseId,
                day: new Date(responseDataFromFrontend.day).toISOString(),
            };

            console.log("Sending response payload to backend:", payload);

            const data = await sendResponse(payload);

            // Cập nhật state local để phản ánh trạng thái RESOLVED
            setSupportRequests((prevRequests) =>
                prevRequests.map((request) =>
                    request.request_id === payload.request_id ? { ...request, status: "Resolved" } : request
                )
            );

            return data;
        } catch (err) {
            console.error("Error in handleSendResponse (context):", err);
            throw new Error(err.message || "Không thể gửi phản hồi. Vui lòng thử lại.");
        }
    };

    return (
        <ConsultantSupportContext.Provider
            value={{
                supportRequests,
                fetchSupportRequests: handleFetchSupportRequests,
                sendResponse: handleSendResponse,
                loading,
                error,
            }}
        >
            {children}
        </ConsultantSupportContext.Provider>
    );
};

// Hook để sử dụng ConsultantSupportContext
export const useConsultantSupport = () => {
    const context = useContext(ConsultantSupportContext);
    if (!context) {
        throw new Error("useConsultantSupport phải được sử dụng bên trong ConsultantSupportProvider");
    }
    return context;
};