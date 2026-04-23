import React from 'react';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { MdCancel } from "react-icons/md";
import { API_URL } from "../../../../utils/API_Port";

const TourImageUploader = ({
  selectedImages,
  displayImages,
  imageCount,
  processFiles,
  removeImage,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleImageUpload
}) => {
  return (
    <div className="image-section mb-3">
      <Form.Label className="text-secondary">Ảnh đã chọn ({imageCount}/5)</Form.Label>
      <Container className="selected-images">
        <Row>
          {displayImages.map((image, index) => (
            <Col key={index} xs={6} md={2} className="mb-2">
              <div className="position-relative image-container">
                <img src={image.startsWith('blob:') ? image : `${API_URL}/${image}`} alt={`Selected ${index + 1}`} className="img-thumbnail" />
                <Button 
                  variant="light" 
                  size="sm" 
                  className="position-absolute top-0 end-0 rounded-circle delete-btn"
                  onClick={() => removeImage(index)}
                >
                  <MdCancel size={25}/>
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      </Container>
      
      <div className="add-images mt-3">
        <Form.Label className="mb-0">Thêm ảnh</Form.Label>
        <div 
          className="upload-area p-3 mt-2"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <p className="text-muted mb-0">Chọn ảnh từ máy hoặc kéo thả</p>
            <Form.Control
              type="file"
              multiple
              onChange={handleImageUpload}
              className="d-none"
              id="imageUpload"
              accept="image/*"
            />
            <label htmlFor="imageUpload" className="btn btn-outline-secondary mt-2">
              Chọn ảnh
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourImageUploader; 