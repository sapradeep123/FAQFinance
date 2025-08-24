@echo off
echo ========================================
echo    FAQ Finance Database Setup
echo ========================================
echo.

REM Set environment variables
set DATABASE_URL=postgres://postgres:postgres%%40123@localhost:5432/postgres
set TARGET_DB=faq_finance

echo Setting up database: %TARGET_DB%
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

REM Create database
echo Creating database...
cd backend
node scripts/create-db.js %TARGET_DB%
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

REM Run migrations
echo Running migrations...
set DATABASE_URL=postgres://postgres:postgres%%40123@localhost:5432/%TARGET_DB%
node scripts/pg-migrate.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)

REM Create admin user
echo Creating admin user...
node scripts/create-admin-user.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to create admin user
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database setup completed successfully!
echo ========================================
echo.
echo Database: %TARGET_DB%
echo Admin user: admin@example.com
echo Admin password: admin123
echo.
echo You can now run start-app.bat to start the application
echo.
pause
