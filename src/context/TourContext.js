import React, { createContext, useState, useEffect } from "react";
import { getTour, addTour, updateTour, blockTour, blockBatchTour, getTourByProvince, getTourOutstanding} from "../api/tourAPI";
import { getItinerary } from "../api/scheduleAPI";
import { getTourImages } from "../api/imageAPI";
import { sortToursByAvailability } from "../utils/tourFilterHelpers";
// Tạo Context
export const TourContext = createContext();

// Provider Component
export const TourProvider = ({ children }) => {
  const [tours, setTours] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);


 const fetchTours = async (filter={}) => {
      setIsLoading(true);
      try {
        const data = await getTour(filter);
        setTours(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
  };

  // Lấy danh sách tour khi component mount
  useEffect(() => {
    console.log("tour context use effect run!")
    fetchTours();
  }, []);


  const handleBlockTour = async (id) => {
    try {
      setIsLoading(true);
      await blockTour(id);
      setTours((prevTours) => prevTours.filter((tour) => tour.tour_id !== id));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  //Khóa nhiều tour
  const handleBlockBatchTour = async (ids) => {
    try {
      setIsLoading(true);
      await blockBatchTour(ids);
      setTours((prevTours) => prevTours.filter((tour) => !ids.includes(tour.tour_id)));
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm tour mới
  const handleAddTour = async (tourData) => {
    try {
      setIsLoading(true);
      const result = await addTour(tourData);
      
      // setTours((prevTours) => [...prevTours, tourData]);
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật tour
  const handleUpdateTour = async (tourData) => {
    try {
      setIsLoading(true);
      const result = await updateTour(tourData, tourData.tour_id);
      
      // Update the tour in the state
      setTours((prevTours) => 
        prevTours.map(tour => 
          tour.tour_id === tourData.tour_id ? { ...tour, ...tourData } : tour
        )
      );
      
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetTourByProvince = async (province, limit, cusId) => {
    try {
      setIsLoading(true);
      const result = await getTourByProvince(province, limit, cusId);
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetTourOutstanding = async (cusID) => {
    try {
      setIsLoading(true);
      const result = await getTourOutstanding(cusID);
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetImages = async (tour_id) => {
    try{
      const result = await getTourImages(tour_id);
      return result;
    }catch(err){
      setError(err.message);
      throw err;
    }
  }
  const handleGetItinerary = async (tour_id) => {
    try {
      const result = await getItinerary(tour_id);
      return result;
    } catch (error) {
      setError(error.message);
    }
  }
  // Giá trị cung cấp cho Context
  const value = {
    tours,
    isLoading,
    error,
    fetchTours,
    addTour: handleAddTour,
    updateTour: handleUpdateTour,
    getItinerary: handleGetItinerary,
    blockTour: handleBlockTour,
    blockBatchTour: handleBlockBatchTour,
    getImages: handleGetImages,
    getTourByProvince: handleGetTourByProvince,
    getTourOutstanding: handleGetTourOutstanding,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};