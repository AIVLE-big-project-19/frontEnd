import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteBoard, getBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import CommentList from "../components/CommentList";
import Layout from "../components/Layout";
import { allowsComments, INQUIRY_CATEGORY, isAdminOnlyCategory } from "../constants/boardCategory";
import "../styles/board.css";

function BoardDetailPage() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { loginId, isAdmin } = useAuth();

    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);

    const categoryListPath = boardCategory => (
        `/boards?${new URLSearchParams({ category: boardCategory }).toString()}`
    );

    useEffect(() => {
        let active = true;

        const loadBoard = async () => {
            try {
                const response = await getBoard(boardId);
                if (active) setBoard(response.data.data);
            } catch (error) {
                console.log(error);
                if (active) {
                    alert(error.response?.status === 403
                        ? "본인이 작성한 1:1 문의만 열람할 수 있습니다."
                        : "게시글을 불러오지 못했습니다.");
                    navigate("/boards");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        loadBoard();
        return () => { active = false; };
    }, [boardId, navigate]);

    const handleDelete = async () => {
        if (!board) return;

        const isOwner = board.owner ?? board.writer === loginId;
        const canDelete = isAdminOnlyCategory(board.category)
            ? isAdmin
            : isOwner || (board.category === INQUIRY_CATEGORY && isAdmin);

        if (!canDelete) {
            alert("게시글을 삭제할 권한이 없습니다.");
            return;
        }

        const confirmDelete = window.confirm("게시글을 삭제하시겠습니까?");

        if (!confirmDelete) return;

        try {
            await deleteBoard(boardId);
            alert("게시글이 삭제되었습니다.");
            navigate(categoryListPath(board.category));
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

    const isMyBoard = board.owner ?? board.writer === loginId;
    const canEdit = isAdminOnlyCategory(board.category)
        ? isAdmin
        : isMyBoard && !(isAdmin && board.category === INQUIRY_CATEGORY);
    const canDelete = isAdminOnlyCategory(board.category)
        ? isAdmin
        : isMyBoard || (board.category === INQUIRY_CATEGORY && isAdmin);

    return (
        <Layout>
            <div className="board-detail-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 상세</h1>

                    <div className="board-actions">
                        <button
                            className="board-btn secondary"
                            onClick={() => navigate(categoryListPath(board.category))}
                        >
                            목록으로
                        </button>

                        {canEdit && (
                                <button
                                    className="board-btn"
                                    onClick={() => navigate(`/boards/${boardId}/edit`)}
                                >
                                    수정
                                </button>
                        )}

                        {canDelete && (
                                <button
                                    className="board-btn danger"
                                    onClick={handleDelete}
                                >
                                    삭제
                                </button>
                        )}
                    </div>
                </div>

                <div className="board-detail-card">
                    <h2 className="board-detail-title">{board.title}</h2>

                    <div className="board-detail-meta">
                        <span className="board-badge">{board.category}</span>
                        <span>작성자: {board.writerName ?? board.writer}</span>
                        <span>조회수: {board.viewCount}</span>
                    </div>

                    <div className="board-detail-content">
                        {board.content}
                    </div>
                </div>

                {allowsComments(board.category) && (
                    <CommentList
                        boardId={boardId}
                        boardCategory={board.category}
                    />
                )}
            </div>
        </Layout>
    );
}

export default BoardDetailPage;
