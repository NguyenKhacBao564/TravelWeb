import { useState } from 'react';

export const useAlert = () => {
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    variant: 'success'
  });

  // Show an alert message with auto-dismiss
  const showAlert = (message, variant = 'success', timeout = 3000) => {
    setAlert({
      show: true,
      message,
      variant
    });
    
    // Auto-dismiss the alert after the specified timeout
    if (timeout) {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, timeout);
    }
  };

  // Hide the alert
  const hideAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  return {
    alert,
    showAlert,
    hideAlert
  };
}; 