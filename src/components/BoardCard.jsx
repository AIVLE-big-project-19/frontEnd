import { Link } from "react-router-dom";

function BoardCard({ board }) {
    return (
        <div className="board-card">
            <h3 className="board-card-title">
                <Link to={`/boards/${board.boardId}`}>
                    {board.title}
                </Link>
            </h3>

            <div className="board-card-meta">
                <span className="board-badge">{board.category}</span>
                <span>작성자: {board.writer}</span>
                <span>조회수: {board.viewCount}</span>
            </div>
        </div>
    );
}

export default BoardCard;