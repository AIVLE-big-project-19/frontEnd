import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import '../styles/RichTextEditor.css';

const EMOJIS = [
    '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤔',
    '😅', '😭', '😢', '😡', '🥺', '😴', '🙄', '😱', '🤩', '👍',
    '👎', '👏', '🙏', '💪', '🎉', '🎊', '✨', '🔥', '💡', '❤️',
    '💚', '💙', '⭐', '✅', '❌', '⚠️', '📌', '📢', '☀️', '🌧️',
];

const ToolbarButton = ({ active, disabled, onClick, label, children }) => (
    <button
        type="button"
        className={`rte-toolbar-btn${active ? ' active' : ''}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
    >
        {children}
    </button>
);

function EmojiPicker({ onPick }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handleOutsideClick = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [open]);

    return (
        <div className="rte-emoji-root" ref={rootRef}>
            <ToolbarButton label="이모티콘" active={open} onClick={() => setOpen((current) => !current)}>🙂</ToolbarButton>
            {open && (
                <div className="rte-emoji-popover" role="menu">
                    {EMOJIS.map((emoji) => (
                        <button
                            type="button"
                            key={emoji}
                            className="rte-emoji-item"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => { onPick(emoji); setOpen(false); }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RichTextEditor({ value, onChange, placeholder = '내용을 입력하세요' }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.isEmpty ? '' : editor.getHTML();
            onChange?.(html);
        },
        editorProps: {
            attributes: {
                class: 'rte-content',
                'aria-label': placeholder,
            },
        },
    });


    useEffect(() => {
        if (!editor) return;
        const current = editor.getHTML();
        const next = value || '';
        if (current === next) return;
        if (current === '<p></p>' && next === '') return;
        editor.commands.setContent(next, { emitUpdate: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div className="rte-wrapper">
            <div className="rte-toolbar" role="toolbar" aria-label="글쓰기 서식 도구">
                <ToolbarButton label="굵게" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
                <ToolbarButton label="기울임" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
                <ToolbarButton label="밑줄" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
                <ToolbarButton label="취소선" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
                <span className="rte-divider" />
                <ToolbarButton label="제목 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
                <ToolbarButton label="제목 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
                <span className="rte-divider" />
                <ToolbarButton label="글머리 목록" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</ToolbarButton>
                <ToolbarButton label="번호 목록" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
                <ToolbarButton label="인용구" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
                <span className="rte-divider" />
                <label className="rte-color-swatch" title="글자 색">
                    <span style={{ color: editor.getAttributes('textStyle').color || '#334155' }}>A</span>
                    <input
                        type="color"
                        aria-label="글자 색"
                        value={editor.getAttributes('textStyle').color || '#334155'}
                        onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
                    />
                </label>
                <label className="rte-color-swatch" title="배경 색(하이라이트)">
                    <span
                        style={{
                            backgroundColor: editor.getAttributes('highlight').color || 'transparent',
                            border: editor.getAttributes('highlight').color ? 'none' : '1px solid #cbd5e1',
                        }}
                    >
                        ⬛
                    </span>
                    <input
                        type="color"
                        aria-label="배경 색"
                        value={editor.getAttributes('highlight').color || '#fff3a3'}
                        onChange={(event) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
                    />
                </label>
                <ToolbarButton
                    label="색상 지우기"
                    onClick={() => editor.chain().focus().unsetColor().unsetHighlight().run()}
                >
                    색지움
                </ToolbarButton>
                <span className="rte-divider" />
                <EmojiPicker onPick={(emoji) => editor.chain().focus().insertContent(emoji).run()} />
                <span className="rte-divider" />
                <ToolbarButton label="실행 취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↺</ToolbarButton>
                <ToolbarButton label="다시 실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↻</ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

export default RichTextEditor;
