import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBoards } from "../api/boardApi";
import BoardCard from "../components/BoardCard";
import Layout from "../components/Layout";
import { BOARD_CATEGORY_DETAILS, getBoardCategoryKey } from "../constants/boardCategory";
import "../styles/board.css";

function BoardListPage() {
    const navigate = useNavigate();

    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        const loadBoards = async () => {
            try {
                const response = await getBoards();
                setBoards(response.data.data.content);
            } catch (error) {
                console.log(error);
                alert("게시글 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadBoards();
    }, []);

    const visibleBoards = selectedCategory
        ? boards.filter(({ category }) => (
            getBoardCategoryKey(category)
            === BOARD_CATEGORY_DETAILS.find(({ name }) => name === selectedCategory)?.key
        ))
        : boards;

    return (
        <Layout>
            <div className="board-page">
                <div className="board-header">
                    <h1 className="board-title">게시판</h1>

                    <div className="board-actions">
                        <button
                            className="board-btn secondary"
                            onClick={() => navigate("/")}
                        >
                            메인으로
                        </button>

                        <button
                            className="board-btn"
                            onClick={() => navigate("/boards/write")}
                        >
                            글쓰기
                        </button>
                    </div>
                </div>

                <nav className="board-category-banners" aria-label="게시판 종류">
                    {BOARD_CATEGORY_DETAILS.map((item) => {
                        const isActive = selectedCategory === item.name;

                        return (
                            <button
                                type="button"
                                key={item.name}
                                className={`board-category-banner category-${item.key}${isActive ? " active" : ""}`}
                                aria-pressed={isActive}
                                onClick={() => setSelectedCategory(isActive ? null : item.name)}
                            >
                                <span className="board-category-banner-label">{item.label}</span>
                                <strong>{item.name}</strong>
                                <span className="board-category-banner-description">{item.description}</span>
                            </button>
                        );
                    })}
                </nav>

                {loading ? (
                    <div className="board-loading">게시글을 불러오는 중...</div>
                ) : visibleBoards.length === 0 ? (
                    <div className="board-empty">
                        {selectedCategory ? `${selectedCategory}에 등록된 게시글이 없습니다.` : "등록된 게시글이 없습니다."}
                    </div>
                ) : (
                    <div className="board-list">
                        {visibleBoards.map((board) => (
                            <BoardCard
                                key={board.boardId}
                                board={board}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default BoardListPage;
