import { Routes, Route } from "react-router-dom";

import MainMapPage from "../pages/MainPage";
import BoardListPage from "../pages/BoardListPage";
import BoardDetailPage from "../pages/BoardDetailPage";
import BoardWritePage from "../pages/BoardWritePage";
import BoardEditPage from "../pages/BoardEditPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import RecommendationTestPage from "../pages/RecommendationTestPage";

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<MainMapPage />} />
            <Route path="/boards" element={<BoardListPage />} />
            <Route path="/boards/write" element={<BoardWritePage />} />
            <Route path="/boards/:boardId/edit" element={<BoardEditPage />} />
            <Route path="/boards/:boardId" element={<BoardDetailPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/test/recommendations" element={<RecommendationTestPage />} />
        </Routes>
    );
}

export default AppRouter;
