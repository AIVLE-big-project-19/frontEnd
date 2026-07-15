import { useState } from "react";
import { createComment } from "../api/commentApi";

function CommentForm({ boardId, onCommentCreated }) {
    const [writer, setWriter] = useState("");
    const [content, setContent] = useState("");

    const submit = async () => {
        if (!writer.trim()) {
            alert("작성자를 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        try {
            await createComment(boardId, {
                writer,
                content,
            });

            alert("댓글이 등록되었습니다.");

            setWriter("");
            setContent("");

            if (onCommentCreated) {
                onCommentCreated();
            }
        } catch (error) {
            console.log(error);
            alert("댓글 등록에 실패했습니다.");
        }
    };

    return (
        <div className="comment-form">
            <h4>댓글 작성</h4>

            <input
                placeholder="작성자"
                value={writer}
                onChange={(e) => setWriter(e.target.value)}
            />

            <textarea
                placeholder="댓글을 입력하세요"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />

            <button
                className="board-btn"
                onClick={submit}
            >
                댓글 등록
            </button>
        </div>
    );
}

export default CommentForm;