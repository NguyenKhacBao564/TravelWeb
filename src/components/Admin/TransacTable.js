// src/pages/Admin/components/TransactionsTable.js
import React from 'react';

/**
 * Props:
 * - data: Array<{ payment_id: string; customerName: string; phone: string; tourCode: string; time: string; amount: number; status: string }>
 */
const TransactionsTable = ({ data }) => (
  <div className="card mb-4">
    <div className="card-header">Giao Dịch Gần Đây</div>
    <div className="card-body p-0">
      <table className="table mb-0">
        <thead className="thead-light">
          <tr>
            <th>ID</th>
            <th>Khách hàng</th>
            <th>Điện thoại</th>
            <th>Tour</th>
            <th>Thời gian</th>
            <th>Số tiền</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data.map((tx) => (
            <tr key={tx.payment_id}>
              <td>{tx.payment_id}</td>
              <td>{tx.customerName}</td>
              <td>{tx.phone}</td>
              <td>{tx.tourCode}</td>
              <td>{tx.time}</td>
              <td>{tx.amount.toLocaleString('vi-VN')} VND</td>
              <td>{tx.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TransactionsTable;