
// Constants for occupancy filter options
export const OCCUPANCY_FILTERS = {
  ALL : 'all',
  LEAST_AVAILABLE: 'leastAvailable',
  MOST_AVAILABLE: 'mostAvailable'
};


/**
 * Sort tours by available spots
 * @param {string} sortOrder - The sort order ('leastAvailable' or 'mostAvailable')
 * @returns {Function} - A sort function that takes two tours and returns a number
 */
export const sortToursByAvailability = (sortOrder) => {
  return (tourA, tourB) => {
    // Calculate available spots

    const availableA = tourA.max_guests - (tourA.booked_slots || 0);
    const availableB = tourB.max_guests - (tourB.booked_slots || 0);
    // Sort according to specified order
    console.log(
      `Sorting: tourA (ID: ${tourA.tour_id}, Name: ${tourA.name}, Available: ${availableA}), tourB (ID: ${tourB.tour_id}, Name: ${tourB.name}, Available: ${availableB})`
    );
    if (sortOrder === OCCUPANCY_FILTERS.LEAST_AVAILABLE) {
      return availableA - availableB; // Ascending (fewest spots first)
    } 
    else if (sortOrder === OCCUPANCY_FILTERS.MOST_AVAILABLE) {
      return availableB - availableA; // Descending (most spots first)
    }
    // Default case (if no sort order is specified)
    return 0;
  };
};



/**
 * Get occupancy filter options with labels
 * @returns {Array} - Array of filter objects with key and label
 */
export const getOccupancyFilters = () => [
  { key: OCCUPANCY_FILTERS.ALL, label: "Tất cả" },
  { key: OCCUPANCY_FILTERS.LEAST_AVAILABLE, label: "Còn ít chỗ trống nhất" },
  { key: OCCUPANCY_FILTERS.MOST_AVAILABLE, label: "Còn nhiều chỗ trống nhất" },
]; 