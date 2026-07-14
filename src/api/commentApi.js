import api from "./axios";

export const getComments = (boardId) => {
    return api.get(`/boards/${boardId}/comments`);
};

export const createComment = (boardId, data) => {
    return api.post(`/boards/${boardId}/comments`, data);
};

export const updateComment = (commentId, data) => {
    return api.put(`/comments/${commentId}`, data);
};

export const deleteComment = (commentId) => {
    return api.delete(`/comments/${commentId}`);
};