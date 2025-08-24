@echo off
echo ========================================
echo    FAQ Finance Application Starter
echo ========================================
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
netstat -an | findstr :5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running on port 5432
    echo Please start PostgreSQL first
    echo.
    pause
    exit /b 1
)

REM Set environment variables
set DATABASE_URL=postgres://postgres:postgres%%40123@localhost:5432/faq_finance
set PORT=5000
set USE_SQLITE=false
set NODE_ENV=development

echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo PORT=%PORT%
echo USE_SQLITE=%USE_SQLITE%
echo NODE_ENV=%NODE_ENV%
echo.

REM Check if backend directory exists
if not exist "backend" (
    echo ERROR: Backend directory not found
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "frontend" (
    echo ERROR: Frontend directory not found
    pause
    exit /b 1
)

REM Start backend in a new window
echo Starting Backend...
start "FAQ Finance Backend" cmd /k "cd /d %CD%\backend && npm run dev"

REM Wait a moment for backend to start
echo Waiting for backend to start...
timeout /t 8 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend...
start "FAQ Finance Frontend" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo ========================================
echo Both services are starting...
echo ========================================
echo.
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:5173
echo.
echo ========================================
echo Admin Login Credentials:
echo ========================================
echo Username: admin@example.com
echo Password: admin123
echo.
echo ========================================
echo Troubleshooting:
echo ========================================
echo If you see errors:
echo 1. Make sure PostgreSQL is running
echo 2. Check if database 'faq_finance' exists
echo 3. Ensure admin user is created in database
echo.
echo To create admin user manually:
echo cd backend && node scripts/create-admin-user.js
echo.
echo Press any key to close this window...
pause >nul