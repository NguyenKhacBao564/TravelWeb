import React, { useRef } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import './InputFieldIcon2.scss';

function InputFiledIcon({ 
    label, 
    value, 
    onChange, 
    placeholder = '', 
    icon,
    name,
    required = false,
    iconSize = 20,
    readOnly = false,
}) {
  const inputRef = useRef(null);
  
  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const IconComponent = icon;
  
  return (
    <Form.Group className="input-field-icon2">
      {label && <Form.Label className="text-secondary">{label}</Form.Label>}
        <InputGroup>
            <InputGroup.Text 
                className="bg-transparent border-0"
                onClick={handleIconClick}
                style={{ cursor: 'pointer' }}
            >
            <IconComponent 
                size={iconSize} 
                className="icon-custom" 
            />
            </InputGroup.Text>
        
            <Form.Control
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="border-0 rounded-0 shadow-none"
            readOnly={readOnly}
            name={name}
            required={required}
            />
        </InputGroup>
    </Form.Group>
  );
}

export default InputFiledIcon;