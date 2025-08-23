# Trae AI Financial Assistant

A full-stack financial assistant application with AI-powered chat, portfolio management, and admin dashboard.

## 🚀 Features

- **Authentication System**: Secure login/signup with JWT tokens
- **AI Chat Interface**: Interactive financial assistant powered by LLM
- **Portfolio Management**: Track and analyze investment portfolios
- **Admin Dashboard**: User management and system monitoring
- **Settings Management**: Customizable user preferences and keyboard shortcuts
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT with bcrypt
- **API Integration**: Yahoo Finance, Google APIs

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Routing**: React Router v6
- **UI Components**: Radix UI primitives

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Trae
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the environment file and configure:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
USE_SQLITE=true
DATABASE_URL=./data/database.sqlite

# Server
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# API Keys (Optional - for full functionality)
YAHOO_FINANCE_API_KEY=your-yahoo-finance-key
GOOGLE_API_KEY=your-google-api-key
```

Start the backend server:
```bash
npm run dev
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Copy the environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` file:
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Trae AI Financial Assistant
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔑 Default Login Credentials

- **Email**: `admin@example.com`
- **Password**: `admin123`

> ⚠️ **Security Note**: Change the default admin password in production!

## 📁 Project Structure

```
Trae/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── db/             # Database schema and migrations
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── app.ts          # Express app configuration
│   │   └── server.ts       # Server entry point
│   ├── scripts/sql/        # SQL schema files
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Route definitions
│   │   ├── stores/         # Zustand state stores
│   │   ├── services/       # API service functions
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   └── package.json
├── .gitignore              # Git ignore rules
├── .env.example            # Environment template
└── README.md               # This file
```

## 🚀 Available Scripts

### Backend Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Frontend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔧 Development Workflow

1. **Start both servers**: Run backend and frontend development servers
2. **Make changes**: Edit code in either `backend/` or `frontend/` directories
3. **Hot reload**: Both servers support hot reloading for fast development
4. **Test features**: Use the default admin account to test functionality

## 📊 Key Features Guide

### Authentication
- Navigate to `/login` or `/signup`
- Use JWT tokens for secure API access
- Protected routes require authentication

### AI Chat
- Access via `/chat` route
- Interactive financial assistant
- Conversation history stored locally

### Portfolio Management
- View at `/portfolio`
- Add/edit investment holdings
- Real-time market data integration

### Admin Dashboard
- Available at `/admin` (admin users only)
- User management
- System health monitoring

### Settings
- User preferences at `/settings`
- Keyboard shortcuts configuration
- Theme and display options

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Kill process on port 5000 (backend)
   npx kill-port 5000
   
   # Kill process on port 5173 (frontend)
   npx kill-port 5173
   ```

2. **Database connection issues**:
   - Ensure SQLite file permissions are correct
   - Check `DATABASE_URL` in backend `.env`

3. **API key errors**:
   - Yahoo Finance and Google API keys are optional for development
   - Some features may be limited without valid API keys

4. **Build errors**:
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🔒 Security Considerations

- Change default admin credentials in production
- Use strong JWT secrets
- Enable HTTPS in production
- Regularly update dependencies
- Review and configure CORS settings

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For questions or issues, please contact the development team or create an issue in the repository.

---

**Happy coding! 🚀**