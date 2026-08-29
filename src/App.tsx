import "./App.css";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";


import {
  HowItWorksPage,
} from "./pages/HowItWorksPage";import {
  BoardDetailPage,
} from "./pages/BoardDetailPage";

import {
  BoardsPage,
} from "./pages/BoardsPage";

import {
  HomePage,
} from "./pages/HomePage";

import {
  AboutPage,
} from "./pages/AboutPage";

import {
  PrivacyPage,
} from "./pages/PrivacyPage";

import {
  TermsPage,
} from "./pages/TermsPage";

import {
  ContactPage,
} from "./pages/ContactPage";

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
            path="/boards"
            element={<BoardsPage />}
          />
          <Route
            path="/how-it-works"
            element={<HowItWorksPage />}
          />

          <Route
            path="/boards/:boardId"
            element={<BoardDetailPage />}
          />

          <Route
            path="/about"
            element={<AboutPage />}
          />

          <Route
            path="/privacy"
            element={<PrivacyPage />}
          />

          <Route
            path="/terms"
            element={<TermsPage />}
          />

          <Route
            path="/contact"
            element={<ContactPage />}
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
