import { useState } from 'react';

export const useTourForm = (branchId) => {
  // Initialize form state
  const [values, setValues] = useState({
    tour_id: '',
    name: '',
    departureLocation: '',
    destination: '',
    duration: 0,
    start_date: '',
    end_date: '',
    max_guests: 0,
    transport: '',
    prices: [
      { age_group: 'adultPrice', price: '0' },
      { age_group: 'childPrice', price: '0' },
      { age_group: 'infantPrice', price: '0' }
    ],
    description: '',
    branch_id: branchId,
    itinerary: [],
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle price fields specially
    if (name === 'adultPrice' || name === 'childPrice' || name === 'infantPrice') {
      // console.log("name: ", name, "value: ", value);
      // const priceValue = value.replace(/\D/g, '') || '0';
      // console.log("priceValue: ", priceValue);
      // Check if the price with this age_group already exists
      const priceIndex = values.prices.findIndex(p => p.age_group === name);
      let newPrices = [...values.prices];
      
      if (priceIndex !== -1) {
        // Update existing price
        newPrices[priceIndex] = { ...newPrices[priceIndex], price: value };
      } else {
        // Add new price
        newPrices.push({ age_group: name, price: value });
      }
      
      setValues({ ...values, prices: newPrices });
      return;
    }
    
    // Handle other fields
    let newValues = { ...values, [name]: value };
    
    // Special handling for dates to calculate duration
    if (name === 'start_date' || name === 'end_date') {
      const start_date = name === 'start_date' ? value : values.start_date;
      const end_date = name === 'end_date' ? value : values.end_date;
      const newDuration = calculateDuration(start_date, end_date);
      
      newValues.duration = newDuration;
      
      // Reset itinerary if duration changes
      const currentDuration = values.duration;
      if (currentDuration !== newDuration) {
        newValues.itinerary = [];
      }
    }
    
    setValues(newValues);
  };

  // Calculate tour duration based on start and end dates
  const calculateDuration = (start_date, end_date) => {
    if (start_date && end_date) {
      const departureD = new Date(start_date);
      const returnD = new Date(end_date);

      if (isNaN(departureD.getTime()) || isNaN(returnD.getTime())) {
        return 0;
      }
      
      departureD.setHours(0, 0, 0, 0);
      returnD.setHours(0, 0, 0, 0);

      const duration = returnD - departureD;
      const durationDay = Math.ceil(duration / (1000 * 60 * 60 * 24));

      if (durationDay <= 0) {
        return 0;
      }
      
      return durationDay + 1;
    }
    return 0;
  };

  // Validate the tour form before submission
  const validateForm = () => {
    // Check if duration is valid
    if (values.duration === 0) {
      return { 
        isValid: false, 
        message: 'Vui lòng nhập thời gian hợp lệ' 
      };
    }
    
    // Check if itinerary matches duration
    if (values.itinerary.length !== values.duration) {
      return { 
        isValid: false, 
        message: 'Vui lòng thêm đủ lịch trình cho tour' 
      };
    }
    
    // Check if all prices are valid
    const hasPrices = values.prices.every(price => 
      parseInt(price.price.replace(/\D/g, '')) >= 0
    );
    
    if (!hasPrices) {
      return {
        isValid: false,
        message: 'Vui lòng nhập giá cho tất cả các loại vé'
      };
    }
    
    // Form is valid
    return { isValid: true };
  };

  return {
    values,
    setValues,
    handleInputChange,
    validateForm
  };
}; 