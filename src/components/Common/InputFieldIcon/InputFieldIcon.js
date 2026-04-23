import React, { useRef } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import './InputFieldIcon.scss';
import { AiFillEdit } from "react-icons/ai";

function InputFiledIcon({ 
  label, 
  value, 
  onChange, 
  name,
  required = false,
  placeholder = '', 
  iconColor = 'warning'
}) {
  const inputRef = useRef(null);
  
  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Form.Group className="input-field-icon">
      {label && <Form.Label className="text-secondary">{label}</Form.Label>}
      <InputGroup>
        <Form.Control
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="border-0 rounded-0 shadow-none"
          name={name}
          required={required}
        />
        <InputGroup.Text 
          className="bg-transparent border-0"
          onClick={handleIconClick}
          style={{ cursor: 'pointer' }}
        >
          <AiFillEdit size={30} className="icon-edit" />
        </InputGroup.Text>
      </InputGroup>
    </Form.Group>
  );
}

export default InputFiledIcon;