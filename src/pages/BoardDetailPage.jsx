import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteBoard, getBoard } from "../api/boardApi";
import CommentList from "../components/CommentList";
import Layout from "../components/Layout";

function BoardDetailPage() {
    const { boardId } = useParams();
    const navigate = useNavigate();

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
        const confirmDelete = window.confirm("게시글을 삭제하시겠습니까?");

        if (!confirmDelete) {
            return;
        }

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
                <div>게시글을 불러오는 중...</div>
            </Layout>
        );
    }

    if (!board) {
        return (
            <Layout>
                <div>게시글이 없습니다.</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="board-detail-page">
                <button onClick={() => navigate("/boards")}>
                    목록으로
                </button>

                <h2>{board.title}</h2>

                <p>작성자 : {board.writer}</p>
                <p>카테고리 : {board.category}</p>
                <p>조회수 : {board.viewCount}</p>

                <hr />

                <p>{board.content}</p>

                <div style={{ marginTop: "20px" }}>
                    <button onClick={handleDelete}>
                        삭제
                    </button>
                </div>

                <hr />

                <CommentList boardId={boardId} />
            </div>
        </Layout>
    );
}

export default BoardDetailPage;