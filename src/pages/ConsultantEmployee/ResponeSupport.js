import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsultantSupport } from '../../context/ConsultantSupportContext';
import "../../styles/consultant/Respone.scss";

function ResponeSupport() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('PENDING');
    const requestsPerPage = 9;
    const navigate = useNavigate();
    const { supportRequests, fetchSupportRequests, loading, error } = useConsultantSupport();

    // Lấy danh sách yêu cầu hỗ trợ khi component mount
    useEffect(() => {
        fetchSupportRequests();
    }, [fetchSupportRequests]);

    // Lọc yêu cầu theo trạng thái và tìm kiếm
    const pendingRequests = supportRequests.filter(request =>
        (request.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.request_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())) &&
        request.status === "PENDING"
    );
    const resolvedRequests = supportRequests.filter(request =>
        (request.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.request_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())) &&
        request.status === "Resolved"
    );

    const respondedCount = resolvedRequests.length;
    const pendingCount = pendingRequests.length;

    // Chọn dữ liệu hiển thị theo tab
    const filteredRequests = activeTab === 'PENDING' ? pendingRequests : resolvedRequests;

    // Phân trang
    const indexOfLastRequest = currentPage * requestsPerPage;
    const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
    const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);
    const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRespond = (requestId) => {
        navigate(`/consultantemployee/request-support/${requestId}`);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Lỗi: {error}</div>;
    }
    return (
        <div className="support-request-container">
            <h2>Danh sách yêu cầu hỗ trợ</h2>
            <div className="table-header">
                <span
                    className={activeTab === 'PENDING' ? 'active-tab' : ''}
                    onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
                    style={{ cursor: 'pointer', marginRight: 16 }}
                >
                    Chưa phản hồi
                </span>
                <span
                    className={activeTab === 'RESOLVED' ? 'active-tab' : ''}
                    onClick={() => { setActiveTab('RESOLVED'); setCurrentPage(1); }}
                    style={{ cursor: 'pointer' }}
                >
                    Đã phản hồi
                </span>
            </div>
            <div className="support-request-table">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Id Khách hàng</th>
                            <th>Loại yêu cầu</th>
                            <th>Thời gian</th>
                            <th>Nội dung</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRequests.length > 0 ? (
                            currentRequests.map((request, index) => (
                                <tr key={request.request_id || index}>
                                    <td>
                                        {/* Avatar sẽ để sau */}
                                        {/* <img src="..." alt="Avatar" className="avatar" /> */}
                                    </td>
                                    <td>#{request.cus_id}</td>
                                    <td>{request.subject || 'Không có thông tin'}</td>
                                    <td>{(() => {
                                        let raw = request.created_at;
                                        console.log('Raw created_at from backend:', raw);
                                        // Nếu là dạng "YYYY-MM-DD HH:mm:ss", thay ' ' bằng 'T' (không cần thêm Z vì dữ liệu trả về đã chuẩn rồi)
                                        if (raw && raw.includes(' ') && !raw.endsWith('Z') && !raw.includes('T')) raw = raw.replace(' ', 'T');
                                        const date = raw ? new Date(raw) : null;

                                        if (!date || isNaN(date.getTime())) {
                                            return 'Không có thông tin';
                                        }

                                        // Lấy các thành phần theo giờ UTC
                                        const hours = date.getUTCHours().toString().padStart(2, '0');
                                        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                                        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
                                        const day = date.getUTCDate().toString().padStart(2, '0');
                                        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // Tháng bắt đầu từ 0
                                        const year = date.getUTCFullYear();

                                        return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
                                    })()}</td>
                                    <td>{request.message || 'Không có nội dung'}</td>
                                    <td>
                                        {activeTab === 'PENDING' && (
                                            <button
                                                className="respond-btn"
                                                onClick={() => handleRespond(request.request_id)}
                                            >
                                                Phản hồi
                                            </button>
                                        )}
                                        {activeTab === 'RESOLVED' && (
                                            <button
                                                className="responded-btn"
                                                disabled
                                                style={{ background: '#bdbdbd', color: '#fff', cursor: 'default' }}
                                            >
                                                Đã phản hồi
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6">Không có yêu cầu hỗ trợ nào để hiển thị.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="pagination">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="nav-btn"
                    >
                        <span className="arrow">&lt;</span> Previous
                    </button>
                    {[...Array(totalPages)].map((_, index) => (
                        <button
                            key={index + 1}
                            onClick={() => handlePageChange(index + 1)}
                            className={currentPage === index + 1 ? 'active' : ''}
                        >
                            {index + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="nav-btn"
                    >
                        Next <span className="arrow">&gt;</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
export default ResponeSupport;