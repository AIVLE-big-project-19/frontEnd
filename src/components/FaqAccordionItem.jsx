import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toSafeHtml } from "../utils/richText";
import "../styles/RichTextEditor.css";

function FaqAccordionItem({ board }) {
    const { isAdmin } = useAuth();
    const [open, setOpen] = useState(false);

    return (
        <div className={`faq-item${open ? " open" : ""}`}>
            <button
                type="button"
                className="faq-question"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
            >
                <span className="faq-question-mark">Q</span>
                <span className="faq-question-text">{board.title}</span>
                <svg className="faq-toggle-icon" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="faq-answer">
                    <span className="faq-answer-mark">A</span>
                    <div
                        className="faq-answer-content rte-rendered"
                        dangerouslySetInnerHTML={{ __html: toSafeHtml(board.content) }}
                    />
                </div>
            )}

            {open && isAdmin && (
                <div className="faq-answer-admin">
                    <Link to={`/boards/${board.boardId}`}>상세보기 / 수정</Link>
                </div>
            )}
        </div>
    );
}

export default FaqAccordionItem;
