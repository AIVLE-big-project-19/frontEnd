import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteBoard, getBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import CommentList from "../components/CommentList";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardDetailPage() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { loginId } = useAuth();

    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBoard();
    }, [boardId]);

    const loadBoard = async () => {
        try {
            const response = await getBoard(boardId);
            setBoard(response.data.data);
        } catch (error) {
            console.log(error);
            alert("게시글을 불러오지 못했습니다.");
            navigate("/boards");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!board) return;

        if (board.writer !== loginId) {
            alert("본인이 작성한 게시글만 삭제할 수 있습니다.");
            return;
        }

        const confirmDelete = window.confirm("게시글을 삭제하시겠습니까?");

        if (!confirmDelete) return;

        try {
            await deleteBoard(boardId);
            alert("게시글이 삭제되었습니다.");
            navigate("/boards");
        } catch (error) {
            console.log(error);
            alert("게시글 삭제에 실패했습니다.");
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-loading">게시글을 불러오는 중...</div>
                </div>
            </Layout>
        );
    }

    if (!board) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-empty">게시글이 없습니다.</div>
                </div>
            </Layout>
        );
    }

    const isMyBoard = board.writer === loginId;

    return (
        <Layout>
            <div className="board-detail-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 상세</h1>

                    <div className="board-actions">
                        <button
                            className="board-btn secondary"
                            onClick={() => navigate("/boards")}
                        >
                            목록으로
                        </button>

                        {isMyBoard && (
                            <>
                                <button
                                    className="board-btn"
                                    onClick={() => navigate(`/boards/${boardId}/edit`)}
                                >
                                    수정
                                </button>

                                <button
                                    className="board-btn danger"
                                    onClick={handleDelete}
                                >
                                    삭제
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="board-detail-card">
                    <h2 className="board-detail-title">{board.title}</h2>

                    <div className="board-detail-meta">
                        <span className="board-badge">{board.category}</span>
                        <span>작성자: {board.writer}</span>
                        <span>조회수: {board.viewCount}</span>
                    </div>

                    <div className="board-detail-content">
                        {board.content}
                    </div>
                </div>

                <CommentList boardId={boardId} />
            </div>
        </Layout>
    );
}

export default BoardDetailPage;