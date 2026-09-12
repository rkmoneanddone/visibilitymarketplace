import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/admin/admin-control-center.css'
import App from './App.tsx'
import { AuthProvider } from "./features/auth/AuthProvider";
import { RuntimeConfigProvider } from "./features/config/RuntimeConfigProvider";


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RuntimeConfigProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RuntimeConfigProvider>
  </StrictMode>,
)
