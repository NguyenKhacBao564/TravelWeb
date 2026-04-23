import React, { useState } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import { getTourStatusFilters, FILTER_KEYS } from "../../../utils/tourFilterHelpers";

function StatusFilterEmployee({ onFilterChange }) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Get filters from utility function
  const filters =[
    { key: 'all', label: "Tất cả" },
    { key: 'Upcoming', label: "Sắp khởi hành" },
    { key: 'Ongoing', label: "Đang khởi hành" },
    { key: 'Completed', label: "Đã hoàn thành" }
  ]

  const handleFilterClick = (filterKey) => {
    setActiveFilter(filterKey);
    onFilterChange({status: filterKey});
  };

  return (
    <ButtonGroup className="tour-status-filter mb-3 mt-3">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? "primary" : "outline-primary"}
          onClick={() => handleFilterClick(filter.key)}
        >
          {filter.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

export default StatusFilterEmployee;