import { useCallback, useEffect, useState } from "react";
import { deleteComment, getComments, updateComment } from "../api/commentApi";
import { useAuth } from "../context/AuthContext";
import CommentForm from "./CommentForm";
import { FREE_CATEGORY, INQUIRY_CATEGORY } from "../constants/boardCategory";
import dayjs from "dayjs";

function CommentList({ boardId, boardCategory }) {
    const { loginId, isAdmin } = useAuth();
    const responseLabel = boardCategory === INQUIRY_CATEGORY ? "답변" : "댓글";
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState("");

    const loadComments = useCallback(async () => {
        try {
            const response = await getComments(boardId);
            setComments(response.data.data);
        } catch {
            alert(`${responseLabel} 목록을 불러오지 못했습니다.`);
        } finally {
            setLoading(false);
        }
    }, [boardId, responseLabel]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadComments();
    }, [loadComments]);

    const startEditing = (comment) => {
        setEditingId(comment.commentId);
        setEditContent(comment.content);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleUpdate = async (commentId) => {
        if (!editContent.trim()) {
            alert(`${responseLabel} 내용을 입력해주세요.`);
            return;
        }

        try {
            await updateComment(commentId, { content: editContent.trim() });
            cancelEditing();
            await loadComments();
        } catch (error) {
            alert(error.response?.status === 403
                ? `본인이 작성한 ${responseLabel}만 수정할 수 있습니다.`
                : `${responseLabel} 수정에 실패했습니다.`);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm(`${responseLabel}을(를) 삭제하시겠습니까?`)) return;

        try {
            await deleteComment(commentId);
            await loadComments();
        } catch (error) {
            alert(error.response?.status === 403
                ? `본인이 작성한 ${responseLabel}만 삭제할 수 있습니다.`
                : `${responseLabel} 삭제에 실패했습니다.`);
        }
    };

    return (
        <div className="comment-section">
            <h3 className="comment-title">{responseLabel}</h3>

            {loading ? (
                <div className="board-loading">{responseLabel}을(를) 불러오는 중...</div>
            ) : comments.length === 0 ? (
                <div className="board-empty">등록된 {responseLabel}이(가) 없습니다.</div>
            ) : (
                <div className="comment-list">
                    {comments.map((comment) => {
                        const isMine = comment.owner ?? (Boolean(loginId) && comment.writer === loginId);
                        const canManage = boardCategory === INQUIRY_CATEGORY ? isAdmin : isMine;
                        const isEditing = editingId === comment.commentId;

                        return (
                            <div key={comment.commentId} className="comment-item">
                                <div className="comment-item-header">
                                    <div className="comment-meta">
                                        <span className="comment-writer">
                                            {boardCategory === INQUIRY_CATEGORY ? "관리자" : (comment.writerName ?? comment.writer)}
                                        </span>
                                        <span className="comment-created-at">
                                            {dayjs(comment.createdAt).format('YYYY. M. D. HH:mm')}
                                        </span>
                                    </div>

                                    <div className="comment-header-right">
                                    {comment.secret && (
                                        <span className="comment-secret-badge">비밀{responseLabel}</span>
                                    )}

                                    {canManage && comment.canView !== false && (
                                        <div className="comment-actions">
                                            {isEditing ? (
                                                <>
                                                    <button className="board-btn" onClick={() => handleUpdate(comment.commentId)}>저장</button>
                                                    <button className="board-btn secondary" onClick={cancelEditing}>취소</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="board-btn" onClick={() => startEditing(comment)}>수정</button>
                                                    <button className="board-btn danger" onClick={() => handleDelete(comment.commentId)}>삭제</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <textarea
                                        className="comment-edit-textarea"
                                        value={editContent}
                                        onChange={(event) => setEditContent(event.target.value)}
                                    />
                                ) : (
                                    <p className="comment-content">{comment.content}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {(boardCategory !== INQUIRY_CATEGORY || isAdmin) && (
                <CommentForm
                    boardId={boardId}
                    onCommentCreated={loadComments}
                    allowSecret={boardCategory === FREE_CATEGORY}
                    responseLabel={responseLabel}
                    showWriter={boardCategory !== INQUIRY_CATEGORY}
                />
            )}
        </div>
    );
}

export default CommentList;
