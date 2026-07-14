import api from "./axios";

export const getBoards = (page = 0, size = 10) => {
    return api.get(`/boards?page=${page}&size=${size}`);
};

export const getBoard = (boardId) => {
    return api.get(`/boards/${boardId}`);
};

export const createBoard = (data) => {
    return api.post("/boards", data);
};

export const updateBoard = (boardId, data) => {
    return api.put(`/boards/${boardId}`, data);
};

export const deleteBoard = (boardId) => {
    return api.delete(`/boards/${boardId}`);
};