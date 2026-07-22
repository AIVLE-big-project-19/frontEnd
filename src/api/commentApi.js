import api from "./axiosInstance";

export const getComments = (boardId) => {
    return api.get(`/boards/${boardId}/comments`, { skipErrorModal: true });
};

export const createComment = (boardId, data) => {
    return api.post(`/boards/${boardId}/comments`, data, { skipErrorModal: true });
};

export const updateComment = (commentId, data) => {
    return api.put(`/comments/${commentId}`, data, { skipErrorModal: true });
};

export const deleteComment = (commentId) => {
    return api.delete(`/comments/${commentId}`, { skipErrorModal: true });
};
