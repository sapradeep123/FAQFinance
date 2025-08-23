import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Toaster } from './components/ui/toaster'
import { TooltipProvider } from './components/ui/tooltip'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  </React.StrictMode>,
)