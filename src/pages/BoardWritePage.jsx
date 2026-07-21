import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import { BOARD_CATEGORIES, isAdminOnlyCategory } from "../constants/boardCategory";
import Layout from "../components/Layout";
import "../styles/board.css";
import { getMyProfile } from "../api/myPageApi";

function BoardWritePage() {
    const navigate = useNavigate();
    const { isLoggedIn, loginId, isAdmin, isInitializing } = useAuth();

    const availableCategories = isAdmin
        ? BOARD_CATEGORIES
        : BOARD_CATEGORIES.filter((item) => !isAdminOnlyCategory(item));

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("자유게시판");
    const [writerName, setWriterName] = useState(loginId ?? "");
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        if (!isLoggedIn) return;
        let active = true;
        getMyProfile()
            .then((profile) => {
                if (active) setWriterName(profile.name || loginId || "");
            })
            .catch(() => {
                if (active) setWriterName(loginId || "");
            });
        return () => { active = false; };
    }, [isLoggedIn, loginId]);

    useEffect(() => {
        const nextPreviews = files.filter((file) => file.type.startsWith("image/")).map((file) => ({ file, url: URL.createObjectURL(file) }));
        setPreviews(nextPreviews);
        return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [files]);

    const selectFiles = (event) => {
        const selected = Array.from(event.target.files ?? []);
        const totalSize = selected.reduce((sum, file) => sum + file.size, 0);
        if (selected.length > 10 || totalSize > 50 * 1024 * 1024 || selected.some((file) => file.size > 10 * 1024 * 1024)) {
            alert("첨부 파일은 최대 10개, 파일당 10MB, 총 50MB까지 가능합니다.");
            event.target.value = "";
            return;
        }
        setFiles(selected);
    };
    const removeSelectedFile = (index) => {
        if (window.confirm("선택한 첨부 파일을 제거하시겠습니까?")) {
            setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
        }
    };

    const submit = async () => {
        if (isInitializing) return;

        if (!isLoggedIn) {
            alert("로그인 후 게시글을 작성할 수 있습니다.");
            navigate("/login");
            return;
        }

        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }

        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        if (!category.trim()) {
            alert("카테고리를 선택해주세요.");
            return;
        }

        if (isAdminOnlyCategory(category) && !isAdmin) {
            alert("공지사항과 FAQ는 관리자만 작성할 수 있습니다.");
            return;
        }

        try {
            const response = await createBoard({
                title,
                content,
                writer: loginId,
                category,
                files,
            });
            const createdBoardId = response.data.data.boardId;

            alert("게시글이 등록되었습니다.");
            navigate(`/boards/${createdBoardId}`, { replace: true });
        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message ?? "게시글 등록에 실패했습니다.");
        }
    };

    if (isInitializing) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-loading">로그인 정보를 확인하는 중...</div>
                </div>
            </Layout>
        );
    }

    if (!isLoggedIn) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-empty">로그인 후 게시글을 작성할 수 있습니다.</div>

                    <button
                        className="board-btn"
                        onClick={() => navigate("/login")}
                    >
                        로그인으로 이동
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="board-write-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 작성</h1>

                    <button
                        className="board-btn secondary"
                        onClick={() => navigate("/boards")}
                    >
                        목록으로
                    </button>
                </div>

                <div className="board-form-card board-form-wide">
                    <div className="board-form-group">
                        <label>제목</label>
                        <input
                            className="board-input"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="board-form-meta">
                        <div className="board-form-group">
                            <label>작성자</label>
                            <input
                                className="board-input readonly"
                                value={writerName}
                                readOnly
                            />
                        </div>

                        <div className="board-form-group">
                            <label>카테고리</label>
                            <select
                                className="board-input"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                {availableCategories.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                            {!isAdmin && (
                                <p className="board-form-help">공지사항과 FAQ는 관리자 계정에서만 작성할 수 있습니다.</p>
                            )}
                        </div>
                    </div>

                    <div className="board-form-group">
                        <label>내용</label>
                        <textarea
                            className="board-textarea"
                            placeholder="내용을 입력하세요"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>첨부 파일</label>
                        <input className="board-file-input" type="file" multiple onChange={selectFiles} />
                        <p className="board-form-help">최대 10개, 파일당 10MB, 총 50MB까지 첨부할 수 있습니다.</p>
                        {files.length > 0 && <ul className="board-selected-files">
                            {files.map((file, index) => <li key={`${file.name}-${index}`}>
                                {previews.find((preview) => preview.file === file) && <img src={previews.find((preview) => preview.file === file).url} alt="선택 이미지 미리보기" />}
                                <span>{file.name}</span><button type="button" onClick={() => removeSelectedFile(index)}>삭제</button>
                            </li>)}
                        </ul>}
                    </div>

                    <div className="board-actions">
                        <button className="board-btn" onClick={submit}>
                            등록
                        </button>

                        <button
                            className="board-btn secondary"
                            onClick={() => navigate("/boards")}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default BoardWritePage;
