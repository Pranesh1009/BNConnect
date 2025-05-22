# Node.js TypeScript Project

A secure Node.js TypeScript project with authentication, session management, and CRUD operations.

## Features

- TypeScript support
- PostgreSQL database with Prisma ORM
- JWT-based authentication
- Single session management
- Password encryption
- Input validation with Joi
- CRUD operations
- Security middleware (helmet, cors)

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/project1_db?schema=public"
   JWT_SECRET="your-super-secret-key-change-this-in-production"
   JWT_EXPIRES_IN="24h"
   PORT=3000
   ```

4. Initialize the database:

   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/logout` - Logout user

### Items

- POST `/api/items` - Create a new item
- GET `/api/items` - Get all items
- GET `/api/items/:id` - Get a specific item
- PUT `/api/items/:id` - Update an item
- DELETE `/api/items/:id` - Delete an item

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Single active session per user
- Input validation
- CORS protection
- Helmet security headers

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
