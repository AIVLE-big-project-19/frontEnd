import { Link } from "react-router-dom";
import { getBoardCategoryKey } from "../constants/boardCategory";

function BoardCard({ board }) {
    const categoryKey = getBoardCategoryKey(board.category);

    return (
        <Link className={`board-card category-${categoryKey}`} to={`/boards/${board.boardId}`}>
            <div className="board-card-category">
                <span className="board-badge">{board.category}</span>
            </div>

            <div className="board-card-body">
                <h3 className="board-card-title">
                    {board.title}
                </h3>

                <div className="board-card-meta">
                    <span>
                        <span className="board-card-meta-label">작성자</span>
                        {board.writerName ?? board.writer}
                    </span>
                    <span>
                        <span className="board-card-meta-label">조회수</span>
                        {board.viewCount}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default BoardCard;
