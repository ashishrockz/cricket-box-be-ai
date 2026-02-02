const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cricket Box API',
      version: '1.0.0',
      description: `
## Cricket Box - Digital Box Cricket Management Platform

Cricket Box is a comprehensive digital platform for organizing, playing, officiating, and analyzing box cricket matches.

### Features:
- **Room Management**: Create and join match rooms with customizable settings
- **Team Setup**: Assign players to teams, set captains, and manage guest players
- **Live Scoring**: Real-time ball-by-ball scoring with instant updates
- **Player Statistics**: Automatic tracking of batting, bowling, and fielding stats
- **Leaderboards**: Global rankings based on various performance metrics
- **Admin Dashboard**: Platform monitoring and user management

### Authentication:
- Email + Password login
- OTP-based login for password recovery
- JWT-based authorization with refresh tokens

### Roles:
- **Admin**: Full platform control
- **Host**: Room creator with team management privileges
- **Player**: Registered user who can join matches
- **Umpire**: Match officiator who controls scoring
- **Viewer**: Read-only access to public matches
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
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.cricketbox.com',
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
            code: { type: 'string', minLength: 6, maxLength: 6 },
            description: { type: 'string' },
            host: { $ref: '#/components/schemas/User' },
            status: { type: 'string', enum: ['waiting', 'team_setup', 'ready', 'in_match', 'completed', 'closed'] },
            settings: { $ref: '#/components/schemas/RoomSettings' },
            teamA: { $ref: '#/components/schemas/Team' },
            teamB: { $ref: '#/components/schemas/Team' }
          }
        },
        RoomSettings: {
          type: 'object',
          properties: {
            overs: { type: 'integer', default: 6 },
            playersPerTeam: { type: 'integer', default: 6 },
            maxParticipants: { type: 'integer', default: 20 },
            isPrivate: { type: 'boolean', default: false },
            allowGuests: { type: 'boolean', default: true }
          }
        },
        Team: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            players: {
              type: 'array',
              items: { $ref: '#/components/schemas/TeamPlayer' }
            }
          }
        },
        TeamPlayer: {
          type: 'object',
          properties: {
            user: { type: 'string', format: 'objectId' },
            isGuest: { type: 'boolean' },
            guestName: { type: 'string' },
            isCaptain: { type: 'boolean' }
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
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and authorization' },
      { name: 'Users', description: 'User management and statistics' },
      { name: 'Rooms', description: 'Match room management' },
      { name: 'Matches', description: 'Match management and live scoring' },
      { name: 'Admin', description: 'Administrative operations' }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
