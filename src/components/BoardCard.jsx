import { Link } from "react-router-dom";
import { getBoardCategoryKey } from "../constants/boardCategory";
import dayjs from 'dayjs';

function BoardCard({ board }) {
    const categoryKey = getBoardCategoryKey(board.category);
    const showWriter = categoryKey !== "faq";
    const isNewNotice = categoryKey === "notice" && dayjs().diff(dayjs(board.createdAt), "day") < 3;

    return (
        <Link className={`board-card category-${categoryKey}`} to={`/boards/${board.boardId}`}>
            <div className="board-card-category">
                <span className="board-badge">{board.category}</span>
            </div>

            <div className="board-card-body">
                <h3 className="board-card-title">
                    {isNewNotice && <span className="board-new-badge">NEW</span>}
                    {board.title}
                </h3>

                <div className="board-card-meta">
                    {categoryKey === "inquiry" && (
                    <span>
                        <span className="board-card-meta-label">작성자</span>
                        {board.writerName ?? board.writer}
                    </span>
                    )}
                    {showWriter && (
                    <span>
                        <span className="board-card-meta-label">작성일</span>
                    {dayjs(board.createdAt).format('YYYY. M. D. HH:MM')}
                    </span>
                    )}
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
