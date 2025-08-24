PostgreSQL setup
================

1) Install PostgreSQL locally or use a cloud instance.
2) Create a database and a user with privileges.
3) Set DATABASE_URL in backend environment (example):

   - Windows PowerShell (session only):
     $env:DATABASE_URL="postgres://user:pass@localhost:5432/faq_finance"

4) Run migrations:

   cd backend
   npm run pg:migrate

5) Start the backend using PostgreSQL (SQLite disabled automatically when DATABASE_URL is set):

   $env:PORT=5000; npm run dev


