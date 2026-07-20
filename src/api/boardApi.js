import api from "./axiosInstance";

export const getBoards = (page = 0, size = 10, category) => {
    return api.get("/boards", { params: { page, size, category } });
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
