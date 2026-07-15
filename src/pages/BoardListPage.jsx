import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBoards } from "../api/boardApi";
import BoardCard from "../components/BoardCard";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardListPage() {
    const navigate = useNavigate();

    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBoards();
    }, []);

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

                {loading ? (
                    <div className="board-loading">게시글을 불러오는 중...</div>
                ) : boards.length === 0 ? (
                    <div className="board-empty">등록된 게시글이 없습니다.</div>
                ) : (
                    <div className="board-list">
                        {boards.map((board) => (
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