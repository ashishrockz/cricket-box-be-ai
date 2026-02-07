const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cricket Box API',
      version: '1.0.0',
      description: `
## Cricket Box - Digital Box Cricket Management Platform

Cricket Box is a comprehensive digital platform for organizing, playing, officiating, and analyzing box cricket matches between friends.

### Features:
- **Room Management**: Create rooms with unique codes, share with friends (max 3 participants)
- **Role Selection**: When 3 friends join, each selects a role (Umpire, Team A In-charge, Team B In-charge)
- **Solo Mode**: If playing alone, creator controls everything
- **Team Setup**: In-charges add player names to their respective teams
- **Live Scoring**: Real-time ball-by-ball scoring with instant updates
- **Player Statistics**: Automatic tracking of batting, bowling, and fielding stats
- **Friend Leaderboards**: Rankings between friends based on performance

### Room Flow:
1. **Create Room** - Get a 6-character code to share with friends
2. **Join Room** - Friends join using the code (max 3 participants including creator)
3. **Select Roles** - Each participant picks: Umpire, Team A In-charge, or Team B In-charge
4. **Add Players** - Each In-charge adds player names to their team
5. **Start Match** - Umpire controls scoring, In-charges select next batsmen

### Authentication:
- Email + Password login
- OTP-based login for password recovery
- JWT-based authorization with refresh tokens

### Roles in Room:
- **Umpire**: Controls match scoring and officiating
- **Team A In-charge**: Manages Team A players and selects next batsman
- **Team B In-charge**: Manages Team B players and selects next batsman
      `,
      contact: {
        name: 'Cricket Box Support',
        email: 'support@cricketbox.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://cricket-box-be-ai.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'objectId' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            fullName: { type: 'string' },
            avatar: { type: 'string', format: 'uri' },
            role: { type: 'string', enum: ['admin', 'host', 'player', 'umpire', 'viewer'] },
            status: { type: 'string', enum: ['active', 'inactive', 'blocked', 'pending_verification'] },
            isEmailVerified: { type: 'boolean' },
            statistics: { $ref: '#/components/schemas/UserStatistics' }
          }
        },
        UserStatistics: {
          type: 'object',
          properties: {
            matchesPlayed: { type: 'integer' },
            matchesWon: { type: 'integer' },
            matchesLost: { type: 'integer' },
            totalRuns: { type: 'integer' },
            totalBallsFaced: { type: 'integer' },
            highestScore: { type: 'integer' },
            fours: { type: 'integer' },
            sixes: { type: 'integer' },
            totalWickets: { type: 'integer' },
            totalOversBowled: { type: 'number' },
            catches: { type: 'integer' }
          }
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'objectId' },
            name: { type: 'string' },
            code: { type: 'string', minLength: 6, maxLength: 6, description: 'Unique 6-character room code for joining' },
            description: { type: 'string' },
            creator: { $ref: '#/components/schemas/User' },
            status: {
              type: 'string',
              enum: ['waiting', 'role_selection', 'team_setup', 'ready', 'in_match', 'completed', 'closed'],
              description: 'waiting: <3 participants, role_selection: 3 participants choosing roles, team_setup: adding players'
            },
            settings: { $ref: '#/components/schemas/RoomSettings' },
            participants: {
              type: 'array',
              items: { $ref: '#/components/schemas/RoomParticipant' },
              maxItems: 3,
              description: 'Maximum 3 participants including creator'
            },
            teamA: { $ref: '#/components/schemas/Team' },
            teamB: { $ref: '#/components/schemas/Team' },
            isSoloMode: { type: 'boolean', description: 'True if only creator is in room' },
            rolesAssigned: { type: 'boolean', description: 'True if all 3 roles are assigned' }
          }
        },
        RoomParticipant: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            joinedAt: { type: 'string', format: 'date-time' },
            role: {
              type: 'string',
              enum: ['umpire', 'team_a_incharge', 'team_b_incharge', null],
              description: 'Role selected by participant (null if not yet selected)'
            },
            isReady: { type: 'boolean' }
          }
        },
        RoomSettings: {
          type: 'object',
          properties: {
            overs: { type: 'integer', default: 6, minimum: 1, maximum: 50 },
            playersPerTeam: { type: 'integer', default: 6, minimum: 2, maximum: 11 },
            wideRuns: { type: 'integer', default: 1, minimum: 1, maximum: 2 },
            noBallRuns: { type: 'integer', default: 1, minimum: 1, maximum: 2 },
            noBallFreehit: { type: 'boolean', default: true }
          }
        },
        Team: {
          type: 'object',
          properties: {
            name: { type: 'string', default: 'Team A/B' },
            players: {
              type: 'array',
              items: { $ref: '#/components/schemas/TeamPlayer' }
            }
          }
        },
        TeamPlayer: {
          type: 'object',
          properties: {
            _id: { type: 'string', format: 'objectId' },
            name: { type: 'string', description: 'Player name added by In-charge' },
            isCaptain: { type: 'boolean', default: false },
            addedBy: { type: 'string', format: 'objectId', description: 'User ID of the In-charge who added this player' }
          }
        },
        RoleSelection: {
          type: 'object',
          required: ['role'],
          properties: {
            role: {
              type: 'string',
              enum: ['umpire', 'team_a_incharge', 'team_b_incharge'],
              description: 'Role to select'
            }
          }
        },
        AddPlayer: {
          type: 'object',
          required: ['playerName'],
          properties: {
            playerName: { type: 'string', minLength: 2, maxLength: 50 },
            isCaptain: { type: 'boolean', default: false }
          }
        },
        Match: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'objectId' },
            room: { type: 'string', format: 'objectId' },
            status: { type: 'string', enum: ['scheduled', 'toss', 'in_progress', 'innings_break', 'completed', 'abandoned', 'cancelled'] },
            toss: { $ref: '#/components/schemas/Toss' },
            innings: {
              type: 'object',
              properties: {
                first: { $ref: '#/components/schemas/Innings' },
                second: { $ref: '#/components/schemas/Innings' }
              }
            },
            result: { $ref: '#/components/schemas/MatchResult' }
          }
        },
        Toss: {
          type: 'object',
          properties: {
            winner: { type: 'string', enum: ['teamA', 'teamB'] },
            decision: { type: 'string', enum: ['bat', 'bowl'] },
            conductedAt: { type: 'string', format: 'date-time' }
          }
        },
        Innings: {
          type: 'object',
          properties: {
            battingTeam: { type: 'string', enum: ['teamA', 'teamB'] },
            bowlingTeam: { type: 'string', enum: ['teamA', 'teamB'] },
            status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
            totalRuns: { type: 'integer' },
            totalWickets: { type: 'integer' },
            totalOvers: { type: 'number' },
            runRate: { type: 'number' }
          }
        },
        MatchResult: {
          type: 'object',
          properties: {
            winner: { type: 'string', enum: ['teamA', 'teamB'] },
            resultType: { type: 'string', enum: ['team_a_won', 'team_b_won', 'tie', 'no_result', 'abandoned'] },
            resultText: { type: 'string' }
          }
        },
        Ball: {
          type: 'object',
          properties: {
            overNumber: { type: 'integer' },
            ballNumber: { type: 'integer' },
            outcome: { type: 'string', enum: ['dot', '1', '2', '3', '4', '6', 'wide', 'no_ball', 'bye', 'leg_bye', 'wicket'] },
            runs: {
              type: 'object',
              properties: {
                batsmanRuns: { type: 'integer' },
                extraRuns: { type: 'integer' },
                totalRuns: { type: 'integer' }
              }
            },
            isWicket: { type: 'boolean' },
            isLegalDelivery: { type: 'boolean' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errorCode: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array' },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    currentPage: { type: 'integer' },
                    itemsPerPage: { type: 'integer' },
                    totalItems: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    hasNextPage: { type: 'boolean' },
                    hasPrevPage: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ForbiddenError: {
          description: 'User does not have permission',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        RoomFullError: {
          description: 'Room is full (maximum 3 participants)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Users', description: 'User management and statistics' },
      { name: 'Friends', description: 'Friend management and leaderboards' },
      { name: 'Rooms', description: 'Match room management (max 3 participants)' },
      { name: 'Matches', description: 'Match management and live scoring' },
      { name: 'Admin', description: 'Administrative operations' }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
