import "./App.css";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  BoardRequestPage,
} from "./pages/BoardRequestPage";

import {
  HomePage,
} from "./pages/HomePage";

import {
  MyDashboardPage,
} from "./pages/MyDashboardPage";

import {
  AdminModerationPage,
} from "./pages/AdminModerationPage";

import {
  AppLayout,
} from "./components/layout/AppLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<HomePage />}
          />
          <Route
            path="/boards/request"
            element={<BoardRequestPage />}
          />

          <Route
            path="/dashboard"
            element={<MyDashboardPage />}
          />

          <Route
            path="/admin/moderation"
            element={<AdminModerationPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;