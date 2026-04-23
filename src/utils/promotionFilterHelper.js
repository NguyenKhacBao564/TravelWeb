export const OCCUPANCY_FILTERS = {
    ALL: 'all',
    ACTIVE: 'active',
    SCHEDULED: 'scheduled',
    EXPIRED: 'expired',
};

export const getOccupancyFilters = () => [
    {key: OCCUPANCY_FILTERS.ACTIVE, label: 'Đang hoạt động'},
    {key: OCCUPANCY_FILTERS.SCHEDULED, label: 'Sắp diễn ra'},
    {key: OCCUPANCY_FILTERS.EXPIRED, label: 'Đã hết hạn'},
]
    


