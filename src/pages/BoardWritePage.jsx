import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import { BOARD_CATEGORIES } from "../constants/boardCategory";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardWritePage() {
    const navigate = useNavigate();
    const { isLoggedIn, loginId, isAdmin, isInitializing } = useAuth();

    const availableCategories = isAdmin
        ? BOARD_CATEGORIES
        : BOARD_CATEGORIES.filter((item) => item !== "공지사항");

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("자유게시판");

    const submit = async () => {
        if (isInitializing) return;

        if (!isLoggedIn) {
            alert("로그인 후 게시글을 작성할 수 있습니다.");
            navigate("/login");
            return;
        }

        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        if (!category.trim()) {
            alert("카테고리를 선택해주세요.");
            return;
        }

        if (category === "공지사항" && !isAdmin) {
            alert("공지사항은 관리자만 작성할 수 있습니다.");
            return;
        }

        try {
            await createBoard({
                title,
                content,
                writer: loginId,
                category,
            });

            alert("게시글이 등록되었습니다.");
            navigate("/boards");
        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message ?? "게시글 등록에 실패했습니다.");
        }
    };

    if (isInitializing) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-loading">로그인 정보를 확인하는 중...</div>
                </div>
            </Layout>
        );
    }

    if (!isLoggedIn) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-empty">로그인 후 게시글을 작성할 수 있습니다.</div>

                    <button
                        className="board-btn"
                        onClick={() => navigate("/login")}
                    >
                        로그인으로 이동
                    </button>
                </div>
            </Layout>
        );
    }

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

                <div className="board-form-card board-form-wide">
                    <div className="board-form-group">
                        <label>제목</label>
                        <input
                            className="board-input"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="board-form-meta">
                        <div className="board-form-group">
                            <label>작성자</label>
                            <input
                                className="board-input readonly"
                                value={loginId}
                                readOnly
                            />
                        </div>

                        <div className="board-form-group">
                            <label>카테고리</label>
                            <select
                                className="board-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {availableCategories.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                            {!isAdmin && (
                                <p className="board-form-help">공지사항은 관리자 계정에서만 작성할 수 있습니다.</p>
                            )}
                        </div>
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
                        <button className="board-btn" onClick={submit}>
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
