import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from './layouts/AppShell'
import { Login } from './routes/auth/Login'
import { Signup } from './routes/auth/Signup'
import { Profile } from './routes/auth/Profile'
import { Chat } from './routes/app/Chat'
import { Portfolio } from './routes/app/Portfolio'
import { Admin } from './routes/app/Admin'
import { Settings } from './routes/app/Settings'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireAdmin } from './components/guards/RequireAdmin'
import ErrorBoundary from './components/ErrorBoundary'
import { NotFound } from './pages/NotFound'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSettingsStore } from './stores/useSettingsStore'
import { useEffect } from 'react'

function App() {
  const { preferences } = useSettingsStore();
  const theme = preferences.theme;
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/profile" element={<Profile />} />
          
          {/* Protected app routes */}
          <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="chat" element={<Chat />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
            <Route path="settings" element={<Settings />} />
            <Route index element={<Navigate to="/app/chat" replace />} />
          </Route>
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/app/chat" replace />} />
          
          {/* 404 route - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))'
            }
          }}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App