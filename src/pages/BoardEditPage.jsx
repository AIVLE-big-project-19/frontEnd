import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBoard, updateBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import { BOARD_CATEGORIES } from "../constants/boardCategory";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardEditPage() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, loginId, isInitializing } = useAuth();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [writer, setWriter] = useState("");
    const [category, setCategory] = useState(BOARD_CATEGORIES[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isInitializing) {
            return;
        }

        if (!isLoggedIn) {
            alert("로그인 후 수정할 수 있습니다.");
            navigate("/login");
            return;
        }

        loadBoard();
    }, [boardId, isInitializing, isLoggedIn]);

    const loadBoard = async () => {
        try {
            const response = await getBoard(boardId);
            const board = response.data.data;

            if (board.writer !== loginId) {
                alert("본인이 작성한 게시글만 수정할 수 있습니다.");
                navigate(`/boards/${boardId}`);
                return;
            }

            setTitle(board.title);
            setContent(board.content);
            setWriter(board.writer);
            setCategory(board.category);
        } catch (error) {
            console.log(error);
            alert("게시글 정보를 불러오지 못했습니다.");
            navigate("/boards");
        } finally {
            setLoading(false);
        }
    };

    const submit = async () => {
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

        try {
            await updateBoard(boardId, {
                title,
                content,
                writer,
                category,
            });

            alert("게시글이 수정되었습니다.");
            navigate(`/boards/${boardId}`);
        } catch (error) {
            console.log(error);
            alert("게시글 수정에 실패했습니다.");
        }
    };

    if (isInitializing || loading) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-loading">게시글을 불러오는 중...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="board-write-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 수정</h1>

                    <button
                        className="board-btn secondary"
                        onClick={() => navigate(`/boards/${boardId}`)}
                    >
                        돌아가기
                    </button>
                </div>

                <div className="board-form-card board-form-wide">
                    <div className="board-form-group">
                        <label>제목</label>
                        <input
                            className="board-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>작성자</label>
                        <input
                            className="board-input readonly"
                            value={writer}
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
                            {BOARD_CATEGORIES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="board-form-group">
                        <label>내용</label>
                        <textarea
                            className="board-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="board-actions">
                        <button
                            className="board-btn"
                            onClick={submit}
                        >
                            수정 완료
                        </button>

                        <button
                            className="board-btn secondary"
                            onClick={() => navigate(`/boards/${boardId}`)}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default BoardEditPage;
