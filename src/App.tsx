import "./App.css";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import {
  HomePage,
} from "./pages/HomePage";

import {
  AdminModerationPage,
} from "./pages/AdminModerationPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/admin/moderation"
          element={
            <AdminModerationPage />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;