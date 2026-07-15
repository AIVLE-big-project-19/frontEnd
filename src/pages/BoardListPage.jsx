import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBoards } from "../api/boardApi";
import BoardCard from "../components/BoardCard";
import Layout from "../components/Layout";

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
                <h1>게시판</h1>

                <div style={{ marginBottom: "20px" }}>
                    <button onClick={() => navigate("/")}>
                        메인으로
                    </button>

                    <button
                        onClick={() => navigate("/boards/write")}
                        style={{ marginLeft: "10px" }}
                    >
                        글쓰기
                    </button>
                </div>

                {loading ? (
                    <div>게시글을 불러오는 중...</div>
                ) : boards.length === 0 ? (
                    <div>등록된 게시글이 없습니다.</div>
                ) : (
                    boards.map((board) => (
                        <BoardCard
                            key={board.boardId}
                            board={board}
                        />
                    ))
                )}
            </div>
        </Layout>
    );
}

export default BoardListPage;