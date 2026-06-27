# TestCase Pro - Test Case Management System

This repository contains the TestCase Pro application, structured with a segregated frontend and backend.

## Repository Structure

```
├── backend/            # Express.js backend (connecting to Supabase)
│   ├── src/            # Backend source files
│   ├── migrations/     # Database migration scripts
│   └── package.json    # Backend configuration
│
└── frontend/           # Vite + React + TypeScript frontend
    ├── src/            # Frontend React components and pages
    ├── public/         # Static assets
    └── package.json    # Frontend configuration
```

## Running the Application

### 1. Backend Service

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Make sure dependencies are installed:
   ```bash
   npm install
   ```
3. Configure the environment:
   - Copy `.env.example` to `.env`
   - Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will start on `http://localhost:3000`.

### 2. Frontend Service

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Make sure dependencies are installed:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will start on `http://localhost:8080` (or another available port).
