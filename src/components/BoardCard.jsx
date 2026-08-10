import { Link } from "react-router-dom";
import { getBoardCategoryKey } from "../constants/boardCategory";
import dayjs from 'dayjs';

function BoardCard({ board, canPin = false, onTogglePin }) {
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
                    {board.title}
                                        {isNewNotice && <span className="board-new-badge">NEW</span>}
                </h3>

                {canPin && (
                    <button
                        type="button"
                        className="board-pin-button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onTogglePin?.(board);
                        }}
                    >
                        {board.pinned ? '고정 해제' : '상단 고정'}
                    </button>
                )}

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
                    {dayjs(board.createdAt).format('YYYY. M. D. HH:mm')}
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
