import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { StatsProvider } from './contexts/StatsContext'
import MaintenanceGate from './components/MaintenanceGate'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <MaintenanceGate>
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <LocaleProvider>
            <ThemeProvider>
              <StatsProvider>
                <App />
              </StatsProvider>
            </ThemeProvider>
          </LocaleProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  </MaintenanceGate>,
)
