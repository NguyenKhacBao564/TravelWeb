import { useState } from 'react';
import { MAX_IMAGES } from "../../../../utils/maxImageUpload";
export const useImageUpload = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [displayImages, setDisplayImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // Chứa URL ảnh cũ từ server


  console.log("selectedImages: ", selectedImages);
  console.log("displayImages: ", displayImages);
  // Handle file input change
  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
      //Reset để có thể chọn lại file vẫn hiện lại file đã chọn
      e.target.value = '';
    }
  };

  // Process image files
  const processFiles = (files) => {
    const newImages = [];
    const newUrls = [];
    
    Array.from(files).forEach(file => {
      if (file.type.match('image.*')) {
        newImages.push(file);
        newUrls.push(URL.createObjectURL(file));
      } else {
        alert('Chỉ chấp nhận file ảnh. File "' + file.name + '" không phải là ảnh.');
      }
    });
    
    // Check maximum image count
    if (selectedImages.length + newImages.length + existingImages.length > MAX_IMAGES) {
      alert(`Chỉ được phép tải lên tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    
    setSelectedImages([...selectedImages, ...newImages]);
    setDisplayImages([...displayImages, ...newUrls]);
  };

  // Handle drag over event
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
  };
  
  // Handle drag leave event
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
  };
  
  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Remove image at specific index
  const removeImage = (index) => {
    // const updatedImages = [...selectedImages];
    const updatedDisplayImages = [...displayImages];
    if (index < existingImages.length) {
      // Xóa ảnh cũ
      const updatedExistingImages = [...existingImages];
      updatedExistingImages.splice(index, 1);
      setExistingImages(updatedExistingImages);
      updatedDisplayImages.splice(index, 1);
    } else {
      // Xóa ảnh mới
      const updatedSelectedImages = [...selectedImages];
      URL.revokeObjectURL(updatedDisplayImages[index]);
      updatedSelectedImages.splice(index - existingImages.length, 1);
      updatedDisplayImages.splice(index, 1);
      setSelectedImages(updatedSelectedImages);
    }

    setDisplayImages(updatedDisplayImages);

  };

  return {
    selectedImages,
    displayImages,
    existingImages,
    setSelectedImages,
    setDisplayImages,
    setExistingImages,
    handleImageUpload,
    processFiles,
    removeImage,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
}; 