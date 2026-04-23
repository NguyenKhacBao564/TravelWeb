import React from 'react';
import { Row, Col } from 'react-bootstrap';
import PriceSelector from './PriceSelector';

function PriceSection({ 
  adultPrice, 
  childPrice, 
  infantPrice, 
  onChange,
  required = false,
  currency = 'VND',
  step = 100000,
  min = 0
}) {
  console.log(adultPrice, childPrice, infantPrice);
  return (
    <div className="price-section mb-3">
      <Row>
        <Col md={4}>
          <PriceSelector
            label="Người lớn:"
            value={adultPrice}
            onChange={onChange}
            name="adultPrice"
            currency={currency}
            step={step}
            min={min}
            required={required}
          />
        </Col>
        <Col md={4}>
          <PriceSelector
            label="Trẻ em:"
            value={childPrice}
            onChange={onChange}
            name="childPrice"
            currency={currency}
            step={step}
            min={min}
            required={required}
          />
        </Col>
        <Col md={4}>
          <PriceSelector
            label="Trẻ sơ sinh:"
            value={infantPrice}
            onChange={onChange}
            name="infantPrice"
            currency={currency}
            step={step}
            min={min}
            required={required}
          />
        </Col>
      </Row>
    </div>
  );
}

export default PriceSection; 