import { useEffect, useState } from "react";
import { createComment } from "../api/commentApi";
import { useAuth } from "../context/AuthContext";
import { getMyProfile } from "../api/myPageApi";

function CommentForm({ boardId, onCommentCreated, allowSecret = false }) {
    const { isLoggedIn, loginId } = useAuth();
    const [content, setContent] = useState("");
    const [secret, setSecret] = useState(false);
    const [writerName, setWriterName] = useState(loginId ?? "");

    useEffect(() => {
        if (!isLoggedIn) return;
        let active = true;
        getMyProfile()
            .then((profile) => {
                if (active) setWriterName(profile.name || loginId || "");
            })
            .catch(() => {
                if (active) setWriterName(loginId || "");
            });
        return () => { active = false; };
    }, [isLoggedIn, loginId]);

    const submit = async () => {
        if (!content.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        try {
            await createComment(boardId, { content: content.trim(), secret });
            setContent("");
            setSecret(false);
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
            <div className="comment-current-writer">작성자: {writerName}</div>
            <textarea
                placeholder="댓글을 입력하세요."
                value={content}
                onChange={(event) => setContent(event.target.value)}
            />
            <div className="comment-submit-row">
                <button className="board-btn" onClick={submit}>댓글 등록</button>
                {allowSecret && (
                    <label className="comment-secret-option">
                        <input
                            type="checkbox"
                            checked={secret}
                            onChange={(event) => setSecret(event.target.checked)}
                        />
                        비밀댓글
                    </label>
                )}
            </div>
        </div>
    );
}

export default CommentForm;
