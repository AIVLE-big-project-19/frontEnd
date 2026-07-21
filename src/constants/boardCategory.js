export const BOARD_CATEGORY_DETAILS = [
    {
        name: "공지사항",
        key: "notice",
        label: "NOTICE",
        description: "서비스의 중요한 소식을 확인하세요.",
    },
    {
        name: "자유게시판",
        key: "free",
        label: "COMMUNITY",
        description: "자유롭게 이야기를 나누는 공간입니다.",
    },
    {
        name: "FAQ",
        key: "faq",
        label: "HELP",
        description: "자주 묻는 질문과 답변을 모았습니다.",
    },
    {
        name: "1:1문의",
        key: "inquiry",
        label: "SUPPORT",
        description: "궁금한 점을 개별적으로 문의하세요.",
    },
];

export const BOARD_CATEGORIES = BOARD_CATEGORY_DETAILS.map(({ name }) => name);

export const ADMIN_ONLY_CATEGORIES = ["공지사항", "FAQ"];
export const NO_COMMENT_CATEGORIES = ["공지사항", "FAQ"];
export const INQUIRY_CATEGORY = "1:1문의";
export const FREE_CATEGORY = "자유게시판";

export const isAdminOnlyCategory = (category) => ADMIN_ONLY_CATEGORIES.includes(category);
export const allowsComments = (category) => !NO_COMMENT_CATEGORIES.includes(category);

export const getBoardCategoryKey = (category) => {
    const aliases = {
        문의: "inquiry",
        기타: "free",
    };

    return BOARD_CATEGORY_DETAILS.find(({ name }) => name === category)?.key
        ?? aliases[category]
        ?? "free";
};
