import React from 'react';
import { Form } from 'react-bootstrap';

const TourDescription = ({ value, onChange }) => {
  return (
    <Form.Group className="mb-3">
      <Form.Label className="text-secondary">Mô tả</Form.Label>
      <Form.Control
        as="textarea"
        rows={5}
        value={value}
        onChange={onChange}
        name="description"
        className="description-box"
        required={true}
      />
    </Form.Group>
  );
};

export default TourDescription; 