import "./App.css";
import "./pages/home-visual-refresh.css";
import "./pages/home-header-highlight.css";
import "./pages/home-hero-highlight.css";

import type {
  ReactNode,
} from "react";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  HowItWorksPage,
} from "./pages/HowItWorksPage";

import {
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

import {
  MaintenanceGuard,
} from "./features/config/MaintenanceGuard";

function guarded(
  element: ReactNode,
) {
  return (
    <MaintenanceGuard>
      {element}
    </MaintenanceGuard>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={guarded(
              <HomePage />,
            )}
          />

          <Route
            path="/boards"
            element={guarded(
              <BoardsPage />,
            )}
          />

          <Route
            path="/how-it-works"
            element={guarded(
              <HowItWorksPage />,
            )}
          />

          <Route
            path="/boards/:boardId"
            element={guarded(
              <BoardDetailPage />,
            )}
          />

          <Route
            path="/about"
            element={guarded(
              <AboutPage />,
            )}
          />

          <Route
            path="/privacy"
            element={guarded(
              <PrivacyPage />,
            )}
          />

          <Route
            path="/terms"
            element={guarded(
              <TermsPage />,
            )}
          />

          <Route
            path="/contact"
            element={guarded(
              <ContactPage />,
            )}
          />

          <Route
            path="/dashboard"
            element={guarded(
              <MyDashboardPage />,
            )}
          />

          <Route
            path="/admin/moderation"
            element={
              <AdminModerationPage />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
