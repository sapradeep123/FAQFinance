import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useAuthStore } from '../stores/useAuthStore'

const Header: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    // Check if dark mode is already enabled
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])
  
  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/app/chat':
        return 'AI Assistant'
      case '/app/portfolio':
        return 'Portfolio'
      case '/app/admin':
        return 'Admin Panel'
      case '/app/settings':
        return 'Settings'
      default:
        return 'Trae Financial AI'
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {getPageTitle()}
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          {/* User menu */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {user?.name || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header