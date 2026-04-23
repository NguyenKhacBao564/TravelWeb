import React, { useRef } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { MdDateRange } from "react-icons/md";
import './DatePicker.scss';

function DatePicker({ label, value, onChange, name, required = false }) {


  const formatDate = (dateString) => { // Hàm định dạng ngày tháng mặc định
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

const inputRef = useRef(null);

  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.(); // Native datepicker (Chrome, Edge)
      inputRef.current.click();        // fallback nếu showPicker không hỗ trợ
    }
  };

  return (
    <Form.Group className="date-picker-input">
      {label && <Form.Label className="form-label">{label}</Form.Label>}
      <InputGroup>
        <InputGroup.Text 
        className="bg-transparent border-0 shadow-none"
        onClick={handleIconClick}
        style={{ cursor: 'pointer' }}
        >
          <MdDateRange size={28} className="icon-custom" />
        </InputGroup.Text>
        <Form.Control
            ref={inputRef}
            type="date"
            name={name}
            value={formatDate(value)}
            onChange={onChange}
            className="border-0 rounded-0 shadow-none no-native-icon"
            required={required}
        />
      </InputGroup>
    </Form.Group>
  );
}

export default DatePicker;
