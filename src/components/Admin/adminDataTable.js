// src/components/Admin/adminDataTable.js
import React from 'react';
import PropTypes from 'prop-types';
import PaginationBar from '../Common/Pagination/PaginationBar';
import "./Styles/adminDataTable.scss";
const AdminDataTable = ({
  columns,
  data,
  loading,
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,

  // rowSelection: {
  //   selectedRowKeys: [],      // array of keys (emp_id, tour_id, ...)
  //   onChange: (newSelectedKeys) => {}, 
  // }
  rowSelection
}) => {
  if (loading) return <p>Loading…</p>;

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasSelection = !!rowSelection;

  // Checkbox trong header để chọn/bỏ chọn tất cả
  const onSelectAll = (e) => {
    if (e.target.checked) {
      const allKeys = data.map(r => r[columns[0].accessor]);
      rowSelection.onChange(allKeys);
    } else {
      rowSelection.onChange([]);
    }
  };

  return (
    <div className="admin-table-container">
      <table className="admin-data-table">
        <thead>
          <tr>
            {hasSelection && (
              <th className="admin-table-checkbox-header" style={{ width: 50 }}>
                <input
                  type="checkbox"
                  checked={rowSelection.selectedRowKeys.length === data.length}
                  onChange={onSelectAll}
                  className="admin-table-checkbox"
                />
              </th>
            )}
            {columns.map(col => (
              <th key={col.accessor} className="admin-table-header">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const rowKey = row[columns[0].accessor];
            const isSelected = hasSelection && rowSelection.selectedRowKeys.includes(rowKey);
            return (
              <tr key={rowKey} className={isSelected ? "admin-table-row selected" : "admin-table-row"}>
                {hasSelection && (
                  <td className="admin-table-checkbox-cell">
                    <div className="admin-table-checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const { selectedRowKeys, onChange } = rowSelection;
                          const idx = selectedRowKeys.indexOf(rowKey);
                          if (idx >= 0) {
                            onChange(selectedRowKeys.filter(k => k !== rowKey));
                          } else {
                            onChange([...selectedRowKeys, rowKey]);
                          }
                        }}
                        className="admin-table-checkbox"
                      />
                      {isSelected && <span className="admin-table-selected-dot" />}
                    </div>
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.accessor} className="admin-table-cell">
                    {col.render
                      ? col.render(row)
                      : row[col.accessor]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="admin-table-pagination-wrapper">
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

AdminDataTable.propTypes = {
  columns:       PropTypes.arrayOf(PropTypes.shape({
                   header: PropTypes.string.isRequired,
                   accessor: PropTypes.string.isRequired,
                   render: PropTypes.func,
                 })).isRequired,
  data:          PropTypes.array.isRequired,
  loading:       PropTypes.bool.isRequired,
  totalItems:    PropTypes.number.isRequired,
  currentPage:   PropTypes.number.isRequired,
  itemsPerPage:  PropTypes.number.isRequired,
  onPageChange:  PropTypes.func.isRequired,
  rowSelection:  PropTypes.shape({
    selectedRowKeys: PropTypes.array.isRequired,
    onChange:        PropTypes.func.isRequired,
  })
};

AdminDataTable.defaultProps = {
  rowSelection: null
};

export default AdminDataTable;
