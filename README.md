# KirtanSarthi

KirtanSarthi is a full-stack platform to discover devotional artists, manage bookings, create events, and chat in real time.

## Features

- User, Artist, and Admin roles
- Artist discovery with filters
- Booking workflow with counter-offers and status tracking
- Public/Private events with nearby event support
- Real-time chat (Socket.IO)
- Ratings and reviews
- Admin approvals, moderation, and dashboard analytics
- AI assistant endpoint for user chat guidance

## Tech Stack

- Frontend: React, Redux Toolkit, React Router, Axios
- Backend: Node.js, Express, MongoDB (Mongoose), JWT
- Realtime: Socket.IO
- Media: Cloudinary

## Project Structure

```text
KirtSart_dummy/
├─ backend/
└─ frontend/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas (or MongoDB instance)

## Environment Setup

Use the example files:

- `backend/.env.example`
- `frontend/.env.example`

Create actual env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then fill real values in `backend/.env`.

## Install & Run

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend default runs on `http://localhost:3000`.

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default runs on `http://localhost:3001` (or CRA default if changed).

## Production Build (Frontend)

```bash
cd frontend
npm run build
```

## API Base

Frontend uses:

- `REACT_APP_BASE_URL=/api/v1` (recommended behind reverse proxy)

If frontend and backend are on different domains, set:

- `REACT_APP_BASE_URL=https://api.your-domain.com/api/v1`

## Security Notes

- Never commit real `.env` values.
- Rotate secrets immediately if exposed.
- Use HTTPS in production (required for secure cookies and reliable geolocation behavior).

## Main Scripts

### Backend

- `npm run dev` – start with nodemon
- `npm start` – start production server

### Frontend

- `npm start` – run development server
- `npm run build` – create production build
- `npm test` – run tests

## Repository

GitHub: `https://github.com/Vinitkhandelwal01/KirtanSarthi.git`

