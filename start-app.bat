@echo off
echo Starting FAQ Finance Application...
echo.

REM Set environment variables
set DATABASE_URL=postgres://postgres:postgres%%40123@localhost:5432/faq_finance
set PORT=5000
set USE_SQLITE=false

echo Environment variables set:
echo DATABASE_URL=%DATABASE_URL%
echo PORT=%PORT%
echo.

REM Start backend in a new window
echo Starting Backend...
start "FAQ Finance Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
echo Starting Frontend...
start "FAQ Finance Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:5173
echo.
echo Admin Login Credentials:
echo Username: admin@example.com
echo Password: admin123
echo.
echo Press any key to close this window...
pause >nul