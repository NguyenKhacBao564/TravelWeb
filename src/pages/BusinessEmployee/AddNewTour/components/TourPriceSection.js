import React from 'react';
import { Container, Row } from 'react-bootstrap';
import PriceSection from '../../../../components/Employee/PriceSelector/PriceSection';

const TourPriceSection = ({ prices, onChange }) => {
  // Find price values for each age group, defaulting to '0' if not found
  const adultPrice = prices.find(item => item.age_group === 'adultPrice')?.price || '0';
  const childPrice = prices.find(item => item.age_group === 'childPrice')?.price || '0';
  const infantPrice = prices.find(item => item.age_group === 'infantPrice')?.price || '0';

  return (
    <Container fluid className="price-section mt-4 mb-3">
      <h5>Chọn Giá:</h5>
      <Row >
        <PriceSection
          adultPrice={adultPrice}
          childPrice={childPrice}
          infantPrice={infantPrice}
          onChange={onChange}
          step={100000}
          required={true}
        />
      </Row>
    </Container>
  );
};

export default TourPriceSection; 