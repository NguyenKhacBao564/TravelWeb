import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import './PriceSelector.scss';
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";

function PriceSelector({ 
  label,
  value,
  onChange,
  name,
  required = false,
  currency = 'VND',
  step = 100000,
  min = 0
}) {

  const handleIncrease = () => {
    const newValue = parseInt(value.replace(/\D/g, ''), 10) + step;
    handleChange(formatPrice(newValue));
  };

  const handleDecrease = () => {
    const currentValue = parseInt(value.replace(/\D/g, ''), 10);
    if (currentValue > min) {
      const newValue = currentValue - step;
      handleChange(formatPrice(Math.max(min, newValue)));
    }
  };

  const handleChange = (newValue) => {
    console.log("new values: ", newValue);
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name,
          value: newValue
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleInputChange = (e) => {
    // Allow only numbers and format them
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      handleChange('');
    } else {
      handleChange(formatPrice(parseInt(rawValue, 10)));
    }
  };

  // Format number with thousand separators
  const formatPrice = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="price-selector">
      <Form.Label className="text-secondary">{label}</Form.Label>
      <InputGroup>
        <Form.Control
          type="text"
          value={value}
          onChange={handleInputChange}
          className="text-danger"
          required={required}
        />
        <InputGroup.Text className="text-secondary">{currency}</InputGroup.Text>
        <Button variant="light" className="border" onClick={handleDecrease}>
          <BsChevronLeft />
        </Button>
        <Button variant="light" className="border" onClick={handleIncrease}>
          <BsChevronRight />
        </Button>
      </InputGroup>
    </div>
  );
}

export default PriceSelector; 