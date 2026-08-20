export const getServerMessage = (err, fallback) => err.response?.data?.message || fallback;
