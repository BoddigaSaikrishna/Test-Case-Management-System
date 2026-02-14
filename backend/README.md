# TestCase Pro Backend

Backend API for the Test Case Management System using Node.js, Express, and Supabase.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update with your Supabase credentials

3. Create the users table in Supabase:
   ```sql
   CREATE TABLE users (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     email VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     name VARCHAR(255),
     role VARCHAR(50) DEFAULT 'user',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create a new user |
| POST | `/api/auth/signin` | Sign in with email/password |
| GET | `/api/auth/me` | Get current user (requires auth) |
| POST | `/api/auth/logout` | Logout user |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server status |

## Request/Response Examples

### Sign Up
```json
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "message": "User created successfully",
  "user": { "id": "...", "email": "...", "name": "...", "role": "user" },
  "token": "jwt_token_here"
}
```

### Sign In
```json
POST /api/auth/signin
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Signed in successfully",
  "user": { "id": "...", "email": "...", "name": "...", "role": "user" },
  "token": "jwt_token_here"
}
```
