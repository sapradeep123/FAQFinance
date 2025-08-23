@echo off
echo ========================================
echo    Trae Financial AI Assistant Startup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

echo Node.js and npm are installed. Proceeding with setup...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Running npm install for backend...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies already installed.
)

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Running npm install for frontend...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed.
)

REM Check for environment files
echo.
echo Checking environment configuration...
cd /d "%~dp0backend"
if not exist ".env" (
    if exist ".env.example" (
        echo Creating backend .env file from .env.example...
        copy ".env.example" ".env"
        echo Please configure your .env file with proper database credentials
    ) else (
        echo WARNING: No .env.example file found in backend
    )
)

cd /d "%~dp0frontend"
if not exist ".env" (
    if exist ".env.example" (
        echo Creating frontend .env file from .env.example...
        copy ".env.example" ".env"
    ) else (
        echo WARNING: No .env.example file found in frontend
    )
)

REM Start the applications
echo.
echo ========================================
echo    Starting Trae Financial AI Assistant
echo ========================================
echo.
echo Starting backend server...
cd /d "%~dp0backend"
start "Trae Backend" cmd /k "npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo Starting frontend server...
cd /d "%~dp0frontend"
start "Trae Frontend" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    Application Started Successfully!
echo ========================================
echo.
echo Backend running at: http://localhost:8080
echo Frontend running at: http://localhost:5173
echo.
echo The application should open in your browser automatically.
echo If not, please navigate to: http://localhost:5173
echo.
echo To stop the application, close both terminal windows.
echo.

REM Try to open the application in default browser
start "" "http://localhost:5173"

echo Press any key to exit this window...
pause >nul
exit /b 0