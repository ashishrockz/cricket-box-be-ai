# Cricket Box - User Stories & Requirements

## Overview
This document outlines all user stories, acceptance criteria, and validation requirements for the Cricket Box platform.

---

## Epic 1: Authentication & User Management

### US-1.1: User Registration
**As a** new user  
**I want to** create an account with my email and password  
**So that** I can access the Cricket Box platform

**Acceptance Criteria:**
- User can register with username, email, password, and personal details
- System validates all input fields
- Email verification OTP is sent after registration
- User receives welcome email after verification
- JWT tokens are issued upon successful registration

**Validations:**
| Field | Rules | Error Message |
|-------|-------|---------------|
| username | Required, 3-30 chars, alphanumeric + underscore, unique | "Username is required" / "Username must be between 3 and 30 characters" / "Username can only contain letters, numbers, and underscores" / "Username is already taken" |
| email | Required, valid email format, unique | "Email is required" / "Please provide a valid email" / "Email is already registered" |
| password | Required, min 8 chars, must contain uppercase, lowercase, number, special char | "Password is required" / "Password must be at least 8 characters" / "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" |
| confirmPassword | Required, must match password | "Please confirm your password" / "Passwords do not match" |
| firstName | Required, 2-50 chars | "First name is required" / "First name must be between 2 and 50 characters" |
| lastName | Optional, max 50 chars | "Last name cannot exceed 50 characters" |
| phone | Optional, valid phone format | "Please provide a valid phone number" |

---

### US-1.2: User Login (Email/Password)
**As a** registered user  
**I want to** login with my email and password  
**So that** I can access my account

**Acceptance Criteria:**
- User can login with valid credentials
- System tracks failed login attempts
- Account is locked after 5 failed attempts for 2 hours
- JWT access and refresh tokens are issued
- Last login timestamp is updated

**Validations:**
| Field | Rules | Error Message |
|-------|-------|---------------|
| email | Required, valid email | "Email is required" / "Please provide a valid email" |
| password | Required | "Password is required" |

**Error Scenarios:**
| Scenario | Error Code | Message |
|----------|------------|---------|
| Invalid credentials | INVALID_CREDENTIALS | "Invalid email or password" |
| Account locked | ACCOUNT_LOCKED | "Account is temporarily locked due to too many failed login attempts" |
| Account blocked | ACCOUNT_BLOCKED | "Your account has been blocked. Please contact support" |
| Account inactive | ACCOUNT_INACTIVE | "Your account is inactive. Please contact support" |

---

### US-1.3: OTP-Based Login
**As a** user who forgot my password  
**I want to** login using an OTP sent to my email  
**So that** I can access my account without remembering my password

**Acceptance Criteria:**
- User can request OTP to their registered email
- OTP is valid for 10 minutes
- Maximum 3 OTP verification attempts
- New OTP invalidates previous ones

**Validations:**
| Field | Rules | Error Message |
|-------|-------|---------------|
| email | Required, valid email | "Email is required" |
| otp | Required, 6 digits | "OTP is required" / "OTP must be 6 digits" |

**Error Scenarios:**
| Scenario | Error Code | Message |
|----------|------------|---------|
| OTP expired | OTP_EXPIRED | "OTP has expired. Please request a new one" |
| Invalid OTP | OTP_INVALID | "Invalid OTP. Please try again" |
| Max attempts | OTP_MAX_ATTEMPTS | "Maximum OTP attempts exceeded. Please request a new OTP" |

---

### US-1.4: Email Verification
**As a** newly registered user  
**I want to** verify my email address  
**So that** I can activate my account fully

**Acceptance Criteria:**
- Verification OTP sent to email upon registration
- User can verify email with OTP
- User can request new verification OTP
- Account status changes to "active" after verification

---

### US-1.5: Password Reset
**As a** user who forgot my password  
**I want to** reset my password using email OTP  
**So that** I can regain access to my account

**Acceptance Criteria:**
- User can request password reset OTP
- OTP valid for 10 minutes
- User must set new password with OTP
- All existing sessions are invalidated after reset
- Confirmation email sent after successful reset

---

### US-1.6: Change Password
**As a** logged-in user  
**I want to** change my password  
**So that** I can maintain account security

**Acceptance Criteria:**
- User must provide current password
- New password must be different from current
- All sessions invalidated after change
- New tokens issued

---

## Epic 2: Room Management

### US-2.1: Create Room
**As a** registered user  
**I want to** create a match room  
**So that** I can organize a cricket match

**Acceptance Criteria:**
- User becomes the host of created room
- Unique 6-character room code is generated
- Host is automatically added as participant
- Room settings can be customized

**Validations:**
| Field | Rules | Error Message |
|-------|-------|---------------|
| name | Required, 3-50 chars | "Room name is required" / "Room name must be between 3 and 50 characters" |
| description | Optional, max 500 chars | "Description cannot exceed 500 characters" |
| settings.overs | Optional, 1-50 | "Overs must be between 1 and 50" |
| settings.playersPerTeam | Optional, 2-11 | "Players per team must be between 2 and 11" |

---

### US-2.2: Join Room
**As a** registered user  
**I want to** join an existing room using a code  
**So that** I can participate in a match

**Acceptance Criteria:**
- User can join with valid room code
- Password required for private rooms
- Cannot join closed or full rooms
- Cannot join same room twice

**Error Scenarios:**
| Scenario | Error Code | Message |
|----------|------------|---------|
| Invalid code | INVALID_ROOM_CODE | "Invalid room code" |
| Room full | ROOM_FULL | "Room is full" |
| Room closed | ROOM_CLOSED | "Room is closed" |
| Already in room | USER_ALREADY_IN_ROOM | "You are already in this room" |

---

### US-2.3: Team Setup
**As a** room host  
**I want to** set up teams  
**So that** players can be organized for the match

**Acceptance Criteria:**
- Host can set team names
- Host can assign players to Team A or Team B
- Host can set team captains
- Same player cannot be in both teams

**Error Scenarios:**
| Scenario | Error Code | Message |
|----------|------------|---------|
| Team full | TEAM_FULL | "Team is full" |
| Already in team | PLAYER_ALREADY_IN_TEAM | "Player is already in a team" |

---

## Epic 3: Match Management

### US-3.1: Start Match
**As a** room host  
**I want to** start a match  
**So that** the cricket game can begin

**Acceptance Criteria:**
- Room must be in "ready" state
- Both teams must have minimum players
- Umpire must be assigned

---

### US-3.2: Conduct Toss
**As an** umpire  
**I want to** record the toss result  
**So that** we can determine batting order

**Validations:**
| Field | Rules | Error Message |
|-------|-------|---------------|
| winner | Required, "teamA" or "teamB" | "Toss winner is required" |
| decision | Required, "bat" or "bowl" | "Toss decision is required" |

---

### US-3.3: Record Ball
**As an** umpire  
**I want to** record each ball  
**So that** the score is tracked accurately

**Ball Outcomes:**
- dot, 1, 2, 3, 4, 6 (Legal deliveries)
- wide, no_ball (Extras - not legal)
- bye, leg_bye (Extras - legal)
- wicket (Can be with any delivery)

**Dismissal Types:**
- bowled, caught, caught_and_bowled
- run_out, stumped, lbw, hit_wicket
- retired_hurt, obstructing_field

---

### US-3.4: Match Completion
**As the** system  
**I want to** automatically complete the match  
**So that** results are determined

**Acceptance Criteria:**
- Match completes when:
  - Second team chases target
  - Second team all out
  - Second innings overs complete
- Result is calculated automatically

---

## Epic 4: Statistics & Leaderboards

### US-4.1: User Statistics
**Statistics Tracked:**
- Matches played/won/lost
- Total runs, balls faced, highest score
- Batting average, strike rate
- Total wickets, overs bowled
- Bowling average, economy rate
- Catches, run outs, stumpings

---

### US-4.2: Leaderboards
**Leaderboard Types:**
- Most Runs
- Most Wickets
- Most Matches
- Most Wins
- Most Sixes/Fours
- Most Catches

---

## Error Code Reference

### Authentication Errors (401)
| Code | Message |
|------|---------|
| INVALID_CREDENTIALS | Invalid email or password |
| TOKEN_EXPIRED | Your session has expired |
| TOKEN_INVALID | Invalid authentication token |
| ACCOUNT_LOCKED | Account is temporarily locked |
| ACCOUNT_BLOCKED | Your account has been blocked |

### Validation Errors (400)
| Code | Message |
|------|---------|
| VALIDATION_ERROR | Validation failed |
| OTP_EXPIRED | OTP has expired |
| OTP_INVALID | Invalid OTP |
| OTP_MAX_ATTEMPTS | Maximum OTP attempts exceeded |

### Authorization Errors (403)
| Code | Message |
|------|---------|
| NOT_ROOM_HOST | Only the room host can perform this action |
| NOT_UMPIRE | Only the umpire can perform this action |
| NOT_ADMIN | Admin privileges required |

### Not Found Errors (404)
| Code | Message |
|------|---------|
| USER_NOT_FOUND | User not found |
| ROOM_NOT_FOUND | Room not found |
| MATCH_NOT_FOUND | Match not found |

### Conflict Errors (409)
| Code | Message |
|------|---------|
| EMAIL_ALREADY_EXISTS | Email is already registered |
| USERNAME_ALREADY_EXISTS | Username is already taken |
| USER_ALREADY_IN_ROOM | You are already in this room |
| PLAYER_ALREADY_IN_TEAM | Player is already in a team |

### Rate Limit Errors (429)
| Code | Message |
|------|---------|
| RATE_LIMIT_EXCEEDED | Too many requests |
