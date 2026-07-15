import { useState } from "react";
import { createComment } from "../api/commentApi";
import { useAuth } from "../context/AuthContext";

function CommentForm({ boardId, onCommentCreated }) {
    const { isLoggedIn, loginId } = useAuth();
    const [content, setContent] = useState("");

    const submit = async () => {
        if (!content.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        try {
            await createComment(boardId, { content: content.trim() });
            setContent("");
            await onCommentCreated?.();
        } catch (error) {
            console.error(error);
            alert("댓글 등록에 실패했습니다.");
        }
    };

    if (!isLoggedIn) {
        return <div className="comment-login-notice">댓글을 작성하려면 로그인해주세요.</div>;
    }

    return (
        <div className="comment-form">
            <h4>댓글 작성</h4>
            <div className="comment-current-writer">작성자: {loginId}</div>
            <textarea
                placeholder="댓글을 입력하세요."
                value={content}
                onChange={(event) => setContent(event.target.value)}
            />
            <button className="board-btn" onClick={submit}>댓글 등록</button>
        </div>
    );
}

export default CommentForm;
