export const getCurrentUserName = () => {
    const userInfo = localStorage.getItem("userInfo");

    if (userInfo) {
        try {
            const parsedUser = JSON.parse(userInfo);

            return parsedUser.name || parsedUser.username || parsedUser.nickname || "";
        } catch (error) {
            console.log("사용자 정보 파싱 실패:", error);
        }
    }

    return localStorage.getItem("name")
        || localStorage.getItem("username")
        || "";
};