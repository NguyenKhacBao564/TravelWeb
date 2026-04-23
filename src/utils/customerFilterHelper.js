
export const filterCustomerBySearchTerm = (searchTerm) => {
    return (customer) => {
      if (!searchTerm || searchTerm.trim() === '') {
        return true;
      }
      
      const term = searchTerm.toLowerCase().trim();
      
      return (
        (customer.fullname && customer.fullname.toLowerCase().includes(term)) ||
        (customer.email && customer.email.toString().includes(term))
      );
    };
  };