import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBoard, updateBoard } from "../api/boardApi";
import { useAuth } from "../context/AuthContext";
import { BOARD_CATEGORIES, INQUIRY_CATEGORY, isAdminOnlyCategory } from "../constants/boardCategory";
import Layout from "../components/Layout";
import "../styles/board.css";

function BoardEditPage() {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, loginId, isAdmin, isInitializing } = useAuth();

    const availableCategories = isAdmin
        ? BOARD_CATEGORIES
        : BOARD_CATEGORIES.filter((item) => !isAdminOnlyCategory(item));

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [writer, setWriter] = useState("");
    const [writerName, setWriterName] = useState("");
    const [category, setCategory] = useState(BOARD_CATEGORIES[0]);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        if (isInitializing) {
            return;
        }

        if (!isLoggedIn) {
            alert("로그인 후 수정할 수 있습니다.");
            navigate("/login");
            return;
        }

        const loadBoard = async () => {
            try {
                const response = await getBoard(boardId);
                const board = response.data.data;

                const isOwner = board.owner ?? board.writer === loginId;
                const canEdit = isAdminOnlyCategory(board.category)
                    ? isAdmin
                    : isOwner && !(isAdmin && board.category === INQUIRY_CATEGORY);

                if (!canEdit) {
                    alert(board.category === INQUIRY_CATEGORY && isAdmin
                        ? "관리자는 1:1 문의 게시글을 수정할 수 없습니다."
                        : "게시글을 수정할 권한이 없습니다.");
                    navigate(`/boards/${boardId}`);
                    return;
                }

                setTitle(board.title);
                setContent(board.content);
                setWriter(board.writer);
                setWriterName(board.writerName ?? board.writer);
                setCategory(board.category);
                setAttachments(board.attachments ?? []);
            } catch (error) {
                console.log(error);
                alert("게시글 정보를 불러오지 못했습니다.");
                navigate("/boards");
            } finally {
                setLoading(false);
            }
        };

        loadBoard();
    }, [boardId, isAdmin, isInitializing, isLoggedIn, loginId, navigate]);

    useEffect(() => {
        const nextPreviews = files.filter((file) => file.type.startsWith("image/")).map((file) => ({ file, url: URL.createObjectURL(file) }));
        setPreviews(nextPreviews);
        return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [files]);

    const selectFiles = (event) => {
        const selected = Array.from(event.target.files ?? []);
        const totalSize = attachments.reduce((sum, attachment) => sum + attachment.fileSize, 0)
            + selected.reduce((sum, file) => sum + file.size, 0);
        if (attachments.length + selected.length > 10 || totalSize > 50 * 1024 * 1024 || selected.some((file) => file.size > 10 * 1024 * 1024)) {
            alert("첨부 파일은 최대 10개, 파일당 10MB, 총 50MB까지 가능합니다.");
            event.target.value = "";
            return;
        }
        setFiles(selected);
    };

    const submit = async () => {
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

        try {
            await updateBoard(boardId, {
                title,
                content,
                writer,
                category,
                files,
                deletedAttachmentIds,
            });

            alert("게시글이 수정되었습니다.");
            navigate(`/boards/${boardId}`);
        } catch (error) {
            console.log(error);
            alert("게시글 수정에 실패했습니다.");
        }
    };

    const removeAttachment = (attachmentId) => {
        if (!window.confirm("이 첨부 파일을 삭제하시겠습니까? 저장하면 복구할 수 없습니다.")) return;
        setAttachments((current) => current.filter((attachment) => attachment.attachmentId !== attachmentId));
        setDeletedAttachmentIds((current) => [...current, attachmentId]);
    };

    const removeSelectedFile = (index) => {
        if (window.confirm("선택한 첨부 파일을 제거하시겠습니까?")) {
            setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
        }
    };

    if (isInitializing || loading) {
        return (
            <Layout>
                <div className="board-page">
                    <div className="board-loading">게시글을 불러오는 중...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="board-write-page">
                <div className="board-header">
                    <h1 className="board-title">게시글 수정</h1>

                    <button
                        className="board-btn secondary"
                        onClick={() => navigate(`/boards/${boardId}`)}
                    >
                        돌아가기
                    </button>
                </div>

                <div className="board-form-card board-form-wide">
                    <div className="board-form-group">
                        <label>제목</label>
                        <input
                            className="board-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

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
                    </div>

                    <div className="board-form-group">
                        <label>내용</label>
                        <textarea
                            className="board-textarea"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="board-form-group">
                        <label>첨부 파일 추가</label>
                        <input className="board-file-input" type="file" multiple onChange={selectFiles} />
                        <p className="board-form-help">최대 10개, 파일당 10MB, 총 50MB까지 첨부할 수 있습니다.</p>
                        {files.length > 0 && <ul className="board-selected-files">
                            {files.map((file, index) => <li key={`${file.name}-${index}`}>
                                {previews.find((preview) => preview.file === file) && <img src={previews.find((preview) => preview.file === file).url} alt="선택 이미지 미리보기" />}
                                <span>{file.name}</span><button type="button" onClick={() => removeSelectedFile(index)}>삭제</button>
                            </li>)}
                        </ul>}
                    </div>

                    <div className="board-form-group">
                        <label>기존 첨부 파일</label>
                        {attachments.length === 0 ? (
                            <p className="board-form-help">첨부된 파일이 없습니다.</p>
                        ) : (
                            <ul className="board-edit-attachments">
                                {attachments.map((attachment) => (
                                    <li key={attachment.attachmentId}>
                                        <span>{attachment.originalFilename}</span>
                                        <button type="button" className="board-attachment-delete"
                                            onClick={() => removeAttachment(attachment.attachmentId)}>
                                            삭제
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="board-actions">
                        <button
                            className="board-btn"
                            onClick={submit}
                        >
                            수정 완료
                        </button>

                        <button
                            className="board-btn secondary"
                            onClick={() => navigate(`/boards/${boardId}`)}
                        >
                            취소
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default BoardEditPage;
