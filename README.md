# Full-Stack Starter Template

A clean, modern starter template for building full-stack web applications.

## Tech Stack

- **Frontend:** React + Vite with hot module reload
- **Backend:** Node.js + Express with nodemon auto-reload
- **Database:** SQLite (better-sqlite3)
- **Styling:** Clean design system with Apple-inspired aesthetics

## Prerequisites

- Node.js (v18 or higher)
- npm

## Project Structure

```
sutton-project/
├── frontend/          # React application
│   ├── src/
│   │   ├── App.jsx   # Main component
│   │   ├── App.css   # Component styles
│   │   └── index.css # Global styles & design tokens
│   └── package.json
├── backend/           # Express server
│   ├── server.js     # API server
│   ├── db.js         # Database connection
│   └── package.json
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server: http://localhost:3001 (auto-restarts on file changes)

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
App: http://localhost:5173 (hot reload enabled)

### 3. Open Application

Visit http://localhost:5173 in your browser

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/data` - Sample endpoint

## Development Features

- **Hot Reload:** Frontend updates instantly on save
- **Auto-Restart:** Backend restarts on code changes
- **Database Ready:** SQLite connection configured
- **Modern Design:** Clean UI with design system variables

## Scripts

**Backend:**
- `npm start` - Run server (production)
- `npm run dev` - Run with nodemon (development)

**Frontend:**
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Design System

The template includes a modern design system with:
- Apple-inspired color palette
- SF Pro font family (system fonts)
- Consistent spacing and shadows
- Dark mode support
- Responsive design

## Building Your App

1. Add your database schema in `backend/db.js`
2. Create API endpoints in `backend/server.js`
3. Build UI components in `frontend/src/`
4. Use design tokens from `frontend/src/index.css`

## Production Build

```bash
cd frontend
npm run build
```

Built files will be in `frontend/dist/`
