export const formatPrice = (price) => {
    if (!price) return '0';
    return Number(price).toLocaleString('vi-VN');
};
