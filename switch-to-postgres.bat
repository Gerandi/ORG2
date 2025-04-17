@echo off
echo Creating .env file with PostgreSQL connection...

echo # Database connection - development environment > backend\.env
echo DATABASE_URL=postgresql+asyncpg://orgai_admin:Windowsandi7@168.119.50.71:5432/orgai >> backend\.env
echo. >> backend\.env
echo # Uncomment for production environment >> backend\.env
echo # DATABASE_URL=postgresql+asyncpg://orgai_admin:Windowsandi7@orgai-database-ut0grc:5432/orgai >> backend\.env

echo Installing required PostgreSQL drivers and dependencies...
cd backend
call venv\Scripts\activate.bat
pip install asyncpg psycopg2-binary python-dotenv

echo Initializing PostgreSQL database structure...
python -m app.core.init_db

echo Do you want to seed the database with sample data? (Y/N)
set /p SEED_DB=

if /i "%SEED_DB%"=="Y" (
    echo Seeding the database...
    python -m app.core.seed_db
)

echo PostgreSQL database setup complete!
echo You can now run the application with "start-dev.bat" script
pause