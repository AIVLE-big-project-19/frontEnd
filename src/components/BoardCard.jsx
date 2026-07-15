import { Link } from "react-router-dom";

function BoardCard({ board }) {
    return (
        <div className="board-card">
            <Link to={`/boards/${board.boardId}`}>
                <h3>{board.title}</h3>
            </Link>

            <p>작성자 : {board.writer}</p>
            <p>카테고리 : {board.category}</p>
            <p>조회수 : {board.viewCount}</p>

            <hr />
        </div>
    );
}

export default BoardCard;