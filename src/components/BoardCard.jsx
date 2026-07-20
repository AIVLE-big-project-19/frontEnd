import { Link } from "react-router-dom";
import { getBoardCategoryKey } from "../constants/boardCategory";

function BoardCard({ board }) {
    const categoryKey = getBoardCategoryKey(board.category);

    return (
        <div className={`board-card category-${categoryKey}`}>
            <div className="board-card-category">
                <span className="board-badge">{board.category}</span>
            </div>

            <div className="board-card-body">
                <h3 className="board-card-title">
                    <Link to={`/boards/${board.boardId}`}>
                        {board.title}
                    </Link>
                </h3>

                <div className="board-card-meta">
                    <span>
                        <span className="board-card-meta-label">작성자</span>
                        {board.writer}
                    </span>
                    <span>
                        <span className="board-card-meta-label">조회수</span>
                        {board.viewCount}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default BoardCard;
