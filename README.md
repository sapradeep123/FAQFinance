# Trae - Financial AI Assistant API

A comprehensive Node.js/TypeScript API for financial portfolio management, market data integration, and AI-powered chat assistance.

## Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Portfolio Management** - Upload, analyze, and manage investment portfolios
- **Market Data Integration** - Real-time data from Yahoo Finance, Google Sheets, and Finnhub
- **AI Chat Assistant** - Multi-provider LLM integration for financial Q&A
- **Admin Dashboard** - User management, system metrics, and configuration
- **FAQ System** - Searchable knowledge base

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **AI/LLM**: OpenAI, Anthropic, Local models
- **Market Data**: Yahoo Finance, Google Sheets API, Finnhub

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Trae
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Environment Variables](#environment-variables))

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb trae_db
   
   # Run migrations
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Server Configuration
```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000
```

### Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trae_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false
```

### Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Market Data APIs
```env
# Google Sheets/SerpAPI
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_API_KEY=your_google_api_key
SERPAPI_KEY=your_serpapi_key

# Finnhub
FINNHUB_KEY=your_finnhub_api_key
```

### LLM Providers
```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Local LLM (optional)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama2
```

### Admin Account
```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
```

### Logging
```env
LOG_LEVEL=info
```

## Database Migrations

The application uses SQL migration files located in `scripts/sql/`:

```bash
# Run all migrations in order
npm run migrate

# Or run individual migration files
psql -d trae_db -f scripts/sql/01_core.sql
psql -d trae_db -f scripts/sql/02_faq.sql
psql -d trae_db -f scripts/sql/03_chat.sql
psql -d trae_db -f scripts/sql/04_portfolio.sql
psql -d trae_db -f scripts/sql/05_admin.sql
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Chat
- `POST /api/chat/ask` - Ask finance-related questions
- `GET /api/chat/inquiries` - Get conversation history

### Portfolio
- `POST /api/portfolio/upload` - Upload portfolio data (CSV/XLSX)
- `GET /api/portfolio/:id/summary` - Get portfolio summary with KPIs
- `POST /api/portfolio/:id/ask` - Ask portfolio-specific questions
- `GET /api/portfolio` - List user portfolios
- `POST /api/portfolio` - Create new portfolio
- `DELETE /api/portfolio/:id` - Delete portfolio

### FAQ
- `GET /api/faq` - Get FAQ entries
- `GET /api/faq/search` - Search FAQ entries

### Admin (Admin role required)
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/role` - Update user role
- `GET /api/admin/api-configs` - Get API configurations
- `PUT /api/admin/api-configs` - Update API configurations
- `GET /api/admin/metrics` - Get system metrics
- `GET /api/admin/logs` - Get system logs

### Health Check
- `GET /health` - System health status

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run migrate      # Run database migrations

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript type checking

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Project Structure

```
src/
├── config/          # Configuration files
│   └── env.ts       # Environment variables
├── db/              # Database connection
│   └── pool.ts      # PostgreSQL connection pool
├── middleware/      # Express middleware
│   ├── authJWT.ts   # JWT authentication
│   ├── errorHandler.ts # Error handling
│   └── requireAdmin.ts # Admin role requirement
├── routes/          # API route handlers
│   ├── auth.ts      # Authentication routes
│   ├── chat.ts      # Chat/AI routes
│   ├── portfolio.ts # Portfolio management
│   ├── admin.ts     # Admin panel routes
│   └── faq.ts       # FAQ routes
├── services/        # Business logic
│   ├── authService.ts     # Authentication service
│   ├── marketDataService.ts # Market data integration
│   ├── llm.ts            # LLM service
│   ├── portfolioService.ts # Portfolio management
│   └── adminService.ts    # Admin functionality
└── index.ts         # Application entry point

scripts/sql/         # Database migration files
├── 01_core.sql      # Core tables (users, etc.)
├── 02_faq.sql       # FAQ system
├── 03_chat.sql      # Chat/inquiry system
├── 04_portfolio.sql # Portfolio management
└── 05_admin.sql     # Admin functionality
```

## Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t trae-api .

# Run container
docker run -p 3000:3000 --env-file .env trae-api
```

### Docker Compose (with PostgreSQL)

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_NAME=trae_db
      - DB_USER=postgres
      - DB_PASSWORD=password
    depends_on:
      - postgres
    
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=trae_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/sql:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Production Deployment

1. **Set production environment variables**
2. **Build the application**
   ```bash
   npm run build
   ```
3. **Run database migrations**
   ```bash
   npm run migrate
   ```
4. **Start the production server**
   ```bash
   npm start
   ```

## Security Considerations

- Use strong JWT secrets (minimum 32 characters)
- Enable SSL/TLS in production
- Configure CORS appropriately
- Use environment variables for all secrets
- Enable rate limiting
- Regular security updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details