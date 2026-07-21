import api from "./axiosInstance";

export const getBoards = (page = 0, size = 10, category) => {
    return api.get("/boards", { params: { page, size, category } });
};

export const getBoard = (boardId) => {
    return api.get(`/boards/${boardId}`);
};

export const createBoard = (data) => {
    return api.post("/boards", toBoardFormData(data));
};

export const updateBoard = (boardId, data) => {
    return api.put(`/boards/${boardId}`, toBoardFormData(data));
};

export const deleteBoard = (boardId) => {
    return api.delete(`/boards/${boardId}`);
};

export const getBoardAttachment = (boardId, attachmentId) =>
    api.get(`/boards/${boardId}/attachments/${attachmentId}`, { responseType: "blob" });

const toBoardFormData = ({ files = [], deletedAttachmentIds = [], ...board }) => {
    const formData = new FormData();
    formData.append("board", new Blob([JSON.stringify(board)], { type: "application/json" }));
    files.forEach((file) => formData.append("files", file));
    deletedAttachmentIds.forEach((id) => formData.append("deletedAttachmentIds", id));
    return formData;
};
