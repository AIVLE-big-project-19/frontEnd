import { useEffect, useState } from "react";
import { deleteComment, getComments } from "../api/commentApi";
import CommentForm from "./CommentForm";

function CommentList({ boardId }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComments();
    }, [boardId]);

    const loadComments = async () => {
        try {
            const response = await getComments(boardId);
            setComments(response.data.data);
        } catch (error) {
            console.log(error);
            alert("댓글 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (commentId) => {
        const confirmDelete = window.confirm("댓글을 삭제하시겠습니까?");

        if (!confirmDelete) {
            return;
        }

        try {
            await deleteComment(commentId);
            alert("댓글이 삭제되었습니다.");
            loadComments();
        } catch (error) {
            console.log(error);
            alert("댓글 삭제에 실패했습니다.");
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
                    {comments.map((comment) => (
                        <div
                            key={comment.commentId}
                            className="comment-item"
                        >
                            <div className="comment-item-header">
                                <span className="comment-writer">
                                    {comment.writer}
                                </span>

                                <button
                                    className="board-btn danger"
                                    onClick={() => handleDelete(comment.commentId)}
                                >
                                    삭제
                                </button>
                            </div>

                            <p className="comment-content">
                                {comment.content}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <CommentForm
                boardId={boardId}
                onCommentCreated={loadComments}
            />
        </div>
    );
}

export default CommentList;