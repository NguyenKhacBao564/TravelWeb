import axios from "axios";
import { API_URL } from "../utils/API_Port";

// Lấy danh sách tour
export const getTour = async (filter = {}) => {
  try {
    const response = await axios.get(`${API_URL}/tours`, {
      params: filter,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi lấy danh sách tour");
  }
};

// Lấy chi tiết một tour theo ID
export const getTourById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/tours/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi lấy chi tiết tour");
  }
};


export const getTourByFilter = async (filter) => {
  try {
    const response = await axios.get(`${API_URL}/tours/tourfilter`, {
      params: filter
    });
    console.log("Response from getTourByFilter: ", filter);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi lấy danh sách tour theo bộ lọc");
  }
}

// Lấy danh sách tour nổi bật giá thấp nhất
export const getTourOutstanding = async (cusId=null) => {
  try {
    const response = await axios.get(`${API_URL}/tours/outstanding`, {
      params: { cusId: cusId }
    });
    return response.data;
  }catch(error){
    throw new Error(error.response?.data?.message || "Lỗi khi lấy danh sách tour");
  }
}

// Lấy danh sách tour theo tỉnh
export const getTourByProvince = async (province, limit=10, cusId=null) => {
  try {
    console.log("Fetching tours for province:", province, "with limit:", limit, "and customer ID:", cusId);
    const response = await axios.get(`${API_URL}/tours/province/${province}`, {
      params: { limit: limit, cusId: cusId }
    });
    return response.data;
  }catch(error){
    throw new Error(error.response?.data?.message || "Lỗi khi lấy danh sách tour theo tỉnh");
  }
}

// Thêm tour mới
export const addTour = async (tourData) => {
  try {
   // Tạo FormData để gửi dữ liệu kèm file
   const formData = new FormData();
      
   // Thêm các file ảnh vào FormData
   if (tourData.images && tourData.images.length > 0) {
     tourData.images.forEach((file, index) => {
       formData.append('image', file);
     });
   }
   
   // Thêm các thông tin khác của tour
   formData.append('tour_id', tourData.tour_id);
   formData.append('name', tourData.name);
   formData.append('departureLocation', tourData.departureLocation);
   formData.append('destination', tourData.destination);
   formData.append('duration', tourData.duration);
   formData.append('start_date', tourData.start_date);
   formData.append('end_date', tourData.end_date);
   formData.append('max_guests', tourData.max_guests);
   formData.append('transport', tourData.transport);
   formData.append('description', tourData.description);
   formData.append('branch_id', tourData.branch_id);


   // Thêm prices và itinerary dưới dạng JSON string do form data chỉ hổ trợ string,số,...
   formData.append('prices', JSON.stringify(tourData.prices));
   formData.append('itinerary', JSON.stringify(tourData.itinerary));
   
    const response = await axios.post(`${API_URL}/tours`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    console.log("response: ", response.data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi thêm tour");
  }
};

// Cập nhật tour
export const updateTour = async (tourData, tourId) => {
  try {
    // Tạo FormData để gửi dữ liệu kèm file
    const formData = new FormData();
      
    // Thêm các file ảnh vào FormData
    if (tourData.images && tourData.images.length > 0) {
      tourData.images.forEach((file, index) => {
        formData.append('image', file);
      });
    }
    
    // Thêm các thông tin khác của tour
    formData.append('tour_id', tourId);
    formData.append('name', tourData.name);
    formData.append('departureLocation', tourData.departureLocation);
    formData.append('destination', tourData.destination);
    formData.append('duration', tourData.duration);
    formData.append('start_date', tourData.start_date);
    formData.append('end_date', tourData.end_date);
    formData.append('max_guests', tourData.max_guests);
    formData.append('transport', tourData.transport);
    formData.append('description', tourData.description);
    formData.append('branch_id', tourData.branch_id);
    formData.append('existingImages', JSON.stringify(tourData.existingImages));
    // Thêm prices và itinerary dưới dạng JSON string do form data chỉ hổ trợ string,số,...
    formData.append('prices', JSON.stringify(tourData.prices));
    formData.append('itinerary', JSON.stringify(tourData.itinerary));
    
    const response = await axios.put(`${API_URL}/tours/update/${tourId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi cập nhật tour");
  }
};

// Khóa tour
export const blockTour = async (id) => {
  try {
    const response = await axios.put(`${API_URL}/tours/block/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi khóa tour");
  }
}

//Khóa nhiều tour
export const blockBatchTour = async (ids) => {
  try {
    const response = await axios.put(`${API_URL}/tours/block_batch`, { tour_ids: ids });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Lỗi khi khóa nhiều tour");
  }
}

