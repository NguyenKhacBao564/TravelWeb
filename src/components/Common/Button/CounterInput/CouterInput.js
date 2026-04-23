import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { GoPlus } from "react-icons/go";
import { RiSubtractFill } from "react-icons/ri";
import "./CounterInput.scss";

function CouterInput({label, value, onChange, name}) {

    const handleSeatDecrease = () => {
      if (value >= 1) {
        const newValue = value - 1;
        onChange({ target: { name, value: newValue } }); // Gọi onChange để cập nhật giá trị
      }
    };

    const handleSeatIncrease = () => {
      const newValue = value + 1;
      onChange({ target: { name, value: newValue } }); // Gọi onChange để cập nhật giá trị
    };

    const handleInputChange = (e) => {
      const newValue = parseInt(e.target.value) || 0;
      onChange({ target: { name, value: newValue } }); // Cập nhật khi người dùng nhập trực tiếp
    };
    
    return (
        <Form.Group className="counter-input">
            <Form.Label className="counter-input-label">{label}</Form.Label>
            <InputGroup>
              <Button variant="light" className="button-subtract" onClick={handleSeatDecrease}>
                <RiSubtractFill size={20}/>
              </Button>
              <Form.Control
                type="text" 
                className="text-center shadow-none border-0"
                value={value}
                onChange={handleInputChange}
                name={name}
              />
              <Button variant="light" className="button-plus" onClick={handleSeatIncrease}>
                    <GoPlus size={20}/>
              </Button>
            </InputGroup>
          </Form.Group>
    );
}

export default CouterInput;