# 🏏 Cricket Box - Backend API

A comprehensive digital platform for organizing, playing, officiating, and analyzing box cricket matches.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Authentication](#-authentication)
- [Roles & Permissions](#-roles--permissions)
- [Socket Events](#-socket-events)
- [Error Handling](#-error-handling)

## ✨ Features

### User Management
- Email + Password registration and login
- OTP-based login and password recovery
- JWT authentication with refresh tokens
- Email verification
- Role-based access control

### Room Management
- Create and join match rooms
- Private rooms with password protection
- Guest player support
- Team setup and player assignment
- Umpire assignment

### Match Management
- Toss management
- Ball-by-ball scoring
- Wicket and dismissal tracking
- Extras (wides, no-balls, byes, leg-byes)
- Innings transitions
- Auto match completion
- Live score updates via WebSocket

### Statistics & Leaderboards
- Player statistics tracking
- Batting/bowling averages
- Multiple leaderboard categories
- Match history

### Admin Features
- Dashboard with platform statistics
- User management (block/unblock)
- Room and match oversight
- Platform configuration

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Email**: Nodemailer
- **Documentation**: Swagger/OpenAPI
- **Validation**: express-validator
- **Security**: helmet, cors, bcryptjs

## 📁 Project Structure

```
cricket-box-backend/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   └── constants.js     # App constants
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── roomController.js
│   │   ├── matchController.js
│   │   └── adminController.js
│   ├── middlewares/
│   │   ├── auth.js          # Authentication
│   │   ├── errorHandler.js  # Error handling
│   │   ├── rateLimiter.js   # Rate limiting
│   │   └── index.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Match.js
│   │   └── index.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── room.routes.js
│   │   ├── match.routes.js
│   │   ├── admin.routes.js
│   │   └── index.js
│   ├── services/
│   │   ├── emailService.js
│   │   ├── jwtService.js
│   │   └── socketService.js
│   ├── swagger/
│   │   └── swagger.config.js
│   ├── utils/
│   │   ├── errors.js
│   │   ├── helpers.js
│   │   └── response.js
│   ├── validators/
│   │   └── index.js
│   └── server.js
├── docs/
│   └── USER_STORIES.md
├── .env.example
├── package.json
└── README.md
```

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cricket-box-backend.git
cd cricket-box-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

5. **Run the server**
```bash
# Development
npm run dev

# Production
npm start
```

## ⚙ Configuration

Create a `.env` file based on `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/cricket_box

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Match Defaults
DEFAULT_OVERS=6
DEFAULT_PLAYERS_PER_TEAM=6
MAX_PLAYERS_PER_ROOM=20
```

## 📖 API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

### API Endpoints Overview

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/verify-email` | Verify email with OTP |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with OTP |
| POST | `/api/v1/auth/change-password` | Change password |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/request-login-otp` | Request OTP for login |
| POST | `/api/v1/auth/otp-login` | Login with OTP |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | Get all users (Admin) |
| GET | `/api/v1/users/search` | Search users |
| GET | `/api/v1/users/leaderboard` | Get leaderboard |
| GET | `/api/v1/users/:userId` | Get user by ID |
| PUT | `/api/v1/users/:userId` | Update profile |
| PATCH | `/api/v1/users/:userId/status` | Update status (Admin) |
| PATCH | `/api/v1/users/:userId/role` | Update role (Admin) |
| DELETE | `/api/v1/users/:userId` | Delete user (Admin) |
| GET | `/api/v1/users/:userId/statistics` | Get user stats |

#### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rooms` | Create room |
| GET | `/api/v1/rooms` | Get all rooms |
| POST | `/api/v1/rooms/join` | Join room by code |
| GET | `/api/v1/rooms/:roomId` | Get room details |
| PUT | `/api/v1/rooms/:roomId` | Update room |
| DELETE | `/api/v1/rooms/:roomId` | Close room |
| POST | `/api/v1/rooms/:roomId/leave` | Leave room |
| POST | `/api/v1/rooms/:roomId/guests` | Add guest |
| DELETE | `/api/v1/rooms/:roomId/guests/:guestId` | Remove guest |
| PUT | `/api/v1/rooms/:roomId/teams` | Set team names |
| POST | `/api/v1/rooms/:roomId/teams/assign` | Assign to team |
| POST | `/api/v1/rooms/:roomId/umpire` | Assign umpire |
| POST | `/api/v1/rooms/:roomId/ready` | Mark ready |
| POST | `/api/v1/rooms/:roomId/match/start` | Start match |

#### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/matches` | Get all matches |
| GET | `/api/v1/matches/:matchId` | Get match details |
| GET | `/api/v1/matches/:matchId/live` | Get live score |
| POST | `/api/v1/matches/:matchId/toss` | Conduct toss |
| POST | `/api/v1/matches/:matchId/batsmen` | Set batsmen |
| POST | `/api/v1/matches/:matchId/bowler` | Set bowler |
| POST | `/api/v1/matches/:matchId/ball` | Record ball |
| DELETE | `/api/v1/matches/:matchId/ball` | Undo last ball |
| POST | `/api/v1/matches/:matchId/newBatsman` | Set new batsman |
| POST | `/api/v1/matches/:matchId/innings/second` | Start 2nd innings |
| POST | `/api/v1/matches/:matchId/end` | End match |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard` | Dashboard stats |
| GET | `/api/v1/admin/users` | Get all users |
| GET | `/api/v1/admin/users/:userId` | User details |
| PATCH | `/api/v1/admin/users/:userId/block` | Toggle block |
| GET | `/api/v1/admin/rooms` | Get all rooms |
| DELETE | `/api/v1/admin/rooms/:roomId` | Force close room |
| GET | `/api/v1/admin/matches` | Get all matches |
| POST | `/api/v1/admin/matches/:matchId/end` | Force end match |
| GET | `/api/v1/admin/config` | Platform config |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Token Usage

Include the token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

### Token Lifecycle
- Access Token: Valid for 7 days
- Refresh Token: Valid for 30 days
- Use `/auth/refresh-token` to get new tokens

## 👥 Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full platform control, user management, force close rooms/matches |
| **Host** | Create rooms, manage teams, assign umpire, start matches |
| **Player** | Join rooms, participate in matches |
| **Umpire** | Conduct toss, record balls, manage scoring |
| **Viewer** | View public matches and leaderboards |

## 🔌 Socket Events

### Client → Server
| Event | Description |
|-------|-------------|
| `join_room` | Join a room for updates |
| `leave_room` | Leave a room |
| `join_match` | Join match for live scoring |
| `leave_match` | Leave match |

### Server → Client
| Event | Description |
|-------|-------------|
| `room_update` | Room data changed |
| `player_joined` | New player joined |
| `player_left` | Player left |
| `match_start` | Match started |
| `toss_result` | Toss completed |
| `ball_update` | Ball recorded |
| `score_update` | Score changed |
| `wicket` | Wicket fell |
| `over_complete` | Over completed |
| `innings_start` | Innings started |
| `innings_end` | Innings completed |
| `match_end` | Match completed |

## ❌ Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| TOKEN_EXPIRED | 401 | JWT token expired |
| TOKEN_INVALID | 401 | Invalid JWT token |
| ACCOUNT_LOCKED | 401 | Too many login attempts |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND_ERROR | 404 | Resource not found |
| CONFLICT_ERROR | 409 | Resource already exists |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_SERVER_ERROR | 500 | Server error |

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

For support, email support@cricketbox.com or open an issue on GitHub.
