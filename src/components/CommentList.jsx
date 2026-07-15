import { useCallback, useEffect, useState } from "react";
import { deleteComment, getComments, updateComment } from "../api/commentApi";
import { useAuth } from "../context/AuthContext";
import CommentForm from "./CommentForm";

function CommentList({ boardId }) {
    const { loginId } = useAuth();
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState("");

    const loadComments = useCallback(async () => {
        try {
            const response = await getComments(boardId);
            setComments(response.data.data);
        } catch (error) {
            console.error(error);
            alert("댓글 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        // Initial server synchronization is intentionally triggered when the board changes.
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
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        try {
            await updateComment(commentId, { content: editContent.trim() });
            cancelEditing();
            await loadComments();
        } catch (error) {
            console.error(error);
            alert(error.response?.status === 403
                ? "본인이 작성한 댓글만 수정할 수 있습니다."
                : "댓글 수정에 실패했습니다.");
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            await deleteComment(commentId);
            await loadComments();
        } catch (error) {
            console.error(error);
            alert(error.response?.status === 403
                ? "본인이 작성한 댓글만 삭제할 수 있습니다."
                : "댓글 삭제에 실패했습니다.");
        }
    };

    return (
        <div className="comment-section">
            <h3 className="comment-title">댓글</h3>

            {loading ? (
                <div className="board-loading">댓글을 불러오는 중...</div>
            ) : comments.length === 0 ? (
                <div className="board-empty">등록된 댓글이 없습니다.</div>
            ) : (
                <div className="comment-list">
                    {comments.map((comment) => {
                        const isMine = Boolean(loginId) && comment.writer === loginId;
                        const isEditing = editingId === comment.commentId;

                        return (
                            <div key={comment.commentId} className="comment-item">
                                <div className="comment-item-header">
                                    <span className="comment-writer">{comment.writer}</span>

                                    {isMine && (
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

            <CommentForm boardId={boardId} onCommentCreated={loadComments} />
        </div>
    );
}

export default CommentList;
