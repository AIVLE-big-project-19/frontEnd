import DOMPurify from 'dompurify';


const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const toSafeHtml = (content) => {
    if (!content) return '';
    const html = HTML_TAG_PATTERN.test(content) ? content : content.replace(/\n/g, '<br>');
    return DOMPurify.sanitize(html);
};
