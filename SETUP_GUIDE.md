# UniSync - MERN Stack Project

A full-stack application built with MongoDB, Express, React, and Node.js (MERN).

## Project Structure

```
UniSync/
├── frontend/          # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── backend/           # Node.js/Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── server.js
│   ├── package.json
│   └── .env
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration (already provided with defaults)

4. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (already provided with API base URL)

4. Start the development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## Running Both Simultaneously

You can run both services in separate terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment mode (development/production)
- `JWT_SECRET` - JWT secret for authentication
- `JWT_EXPIRE` - JWT expiration time

### Frontend (.env)
- `REACT_APP_API_BASE_URL` - Backend API URL

## Dependencies

### Backend
- Express.js - Web framework
- Mongoose - MongoDB ODM
- dotenv - Environment variables
- CORS - Cross-origin resource sharing
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- axios - HTTP client

### Frontend
- React - UI library
- React Router DOM - Routing
- Axios - HTTP client

## Features Ready to Build

- User Authentication (JWT)
- Database Models
- API Routes
- React Components
- State Management
- Responsive UI

## Development Tips

1. Use `npm run dev` in the backend for auto-restart on file changes
2. React will auto-reload on frontend changes
3. Check browser console and server logs for debugging
4. Update `.env` files with your actual configuration before production

## Next Steps

1. Set up MongoDB (local or MongoDB Atlas)
2. Create your first API route in `backend/src/routes/`
3. Create corresponding MongoDB schema in `backend/src/models/`
4. Build React components in `frontend/src/components/`
5. Connect frontend components to backend APIs

## License

MIT
