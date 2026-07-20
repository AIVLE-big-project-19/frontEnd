import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getBoards } from "../api/boardApi";
import BoardCard from "../components/BoardCard";
import Layout from "../components/Layout";
import { BOARD_CATEGORY_DETAILS } from "../constants/boardCategory";
import "../styles/board.css";

function BoardListPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [boards, setBoards] = useState([]);
    const [pageInfo, setPageInfo] = useState({
        page: 0,
        totalPages: 0,
        totalElements: 0,
        first: true,
        last: true,
    });
    const [loading, setLoading] = useState(true);
    const requestedCategory = searchParams.get("category");
    const selectedCategory = BOARD_CATEGORY_DETAILS.some(({ name }) => name === requestedCategory)
        ? requestedCategory
        : BOARD_CATEGORY_DETAILS[0].name;
    const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const currentPage = Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage - 1
        : 0;
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const loadBoards = async () => {
            try {
                const response = await getBoards(currentPage, 6, selectedCategory);
                const data = response.data.data;

                if (data.totalPages > 0 && currentPage >= data.totalPages) {
                    setSearchParams({ category: selectedCategory, page: String(data.totalPages) }, { replace: true });
                    return;
                }

                setBoards(data.content);
                setPageInfo({
                    page: data.page,
                    totalPages: data.totalPages,
                    totalElements: data.totalElements,
                    first: data.first,
                    last: data.last,
                });
            } catch (error) {
                console.log(error);
                alert("게시글 목록을 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadBoards();
    }, [currentPage, refreshKey, selectedCategory, setSearchParams]);

    const selectCategory = (category) => {
        if (category === selectedCategory) {
            if (currentPage !== 0) {
                setLoading(true);
                setSearchParams({ category, page: "1" });
                return;
            }
            setRefreshKey((value) => value + 1);
            return;
        }
        setLoading(true);
        setSearchParams({ category, page: "1" });
    };

    const moveToPage = (page) => {
        if (page < 0 || page >= pageInfo.totalPages || page === pageInfo.page) return;
        setLoading(true);
        setSearchParams({ category: selectedCategory, page: String(page + 1) });
    };

    const pageNumbers = (() => {
        const visibleCount = 5;
        const start = Math.max(
            0,
            Math.min(pageInfo.page - Math.floor(visibleCount / 2), pageInfo.totalPages - visibleCount),
        );
        const end = Math.min(pageInfo.totalPages, start + visibleCount);
        return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index);
    })();

    return (
        <Layout>
            <div className="board-page">
                <div className="board-header">
                    <h1 className="board-title">게시판</h1>

                    <div className="board-actions">
                        <button
                            className="board-btn secondary"
                            onClick={() => navigate("/")}
                        >
                            메인으로
                        </button>

                        <button
                            className="board-btn"
                            onClick={() => navigate("/boards/write")}
                        >
                            글쓰기
                        </button>
                    </div>
                </div>

                <nav className="board-category-banners" aria-label="게시판 종류">
                    {BOARD_CATEGORY_DETAILS.map((item) => {
                        const isActive = selectedCategory === item.name;

                        return (
                            <button
                                type="button"
                                key={item.name}
                                className={`board-category-banner category-${item.key}${isActive ? " active" : ""}`}
                                aria-pressed={isActive}
                                onClick={() => selectCategory(item.name)}
                            >
                                <span className="board-category-banner-label">{item.label}</span>
                                <strong>{item.name}</strong>
                                <span className="board-category-banner-description">{item.description}</span>
                            </button>
                        );
                    })}
                </nav>

                {loading ? (
                    <div className="board-loading">게시글을 불러오는 중...</div>
                ) : boards.length === 0 ? (
                    <div className="board-empty">
                        {`${selectedCategory}에 등록된 게시글이 없습니다.`}
                    </div>
                ) : (
                    <>
                        <div className="board-list-summary">
                            <strong>{selectedCategory}</strong>
                            <span>총 {pageInfo.totalElements.toLocaleString()}개</span>
                        </div>

                        <div className="board-list">
                            {boards.map((board) => (
                                <BoardCard
                                    key={board.boardId}
                                    board={board}
                                />
                            ))}
                        </div>

                        {pageInfo.totalPages > 1 && (
                            <nav className="board-pagination" aria-label={`${selectedCategory} 페이지 이동`}>
                                <button
                                    type="button"
                                    className="board-pagination-nav"
                                    disabled={pageInfo.first}
                                    onClick={() => moveToPage(pageInfo.page - 1)}
                                >
                                    <span aria-hidden="true">‹</span>
                                    이전
                                </button>

                                <div className="board-pagination-pages">
                                    {pageNumbers.map((page) => (
                                        <button
                                            type="button"
                                            key={page}
                                            className={page === pageInfo.page ? "active" : ""}
                                            aria-label={`${page + 1}페이지`}
                                            aria-current={page === pageInfo.page ? "page" : undefined}
                                            onClick={() => moveToPage(page)}
                                        >
                                            {page + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="board-pagination-nav"
                                    disabled={pageInfo.last}
                                    onClick={() => moveToPage(pageInfo.page + 1)}
                                >
                                    다음
                                    <span aria-hidden="true">›</span>
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}

export default BoardListPage;
