import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard } from "../api/boardApi";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardWritePage() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [writer, setWriter] = useState("");
    const [category, setCategory] = useState("");

    const submit = async () => {
        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        if (!writer.trim()) {
            alert("작성자를 입력해주세요.");
            return;
        }

        if (!category.trim()) {
            alert("카테고리를 입력해주세요.");
            return;
        }

        try {
            await createBoard({
                title,
                content,
                writer,
                category,
            });

            alert("게시글이 등록되었습니다.");
            navigate("/boards");
        } catch (error) {
            console.log(error);
            alert("게시글 등록에 실패했습니다.");
        }
    };

    return (
        <Layout>
            <div className="board-write-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 작성</h1>

                    <button
                        className="board-btn secondary"
                        onClick={() => navigate("/boards")}
                    >
                        목록으로
                    </button>
                </div>

                <div className="board-form-card">
                    <div className="board-form-group">
                        <label>제목</label>
                        <input
                            className="board-input"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>작성자</label>
                        <input
                            className="board-input"
                            placeholder="작성자를 입력하세요"
                            value={writer}
                            onChange={(e) => setWriter(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>카테고리</label>
                        <input
                            className="board-input"
                            placeholder="예: 공지사항, 문의, 자유게시판"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>내용</label>
                        <textarea
                            className="board-textarea"
                            placeholder="내용을 입력하세요"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="board-actions">
                        <button
                            className="board-btn"
                            onClick={submit}
                        >
                            등록
                        </button>

                        <button
                            className="board-btn secondary"
                            onClick={() => navigate("/boards")}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default BoardWritePage;