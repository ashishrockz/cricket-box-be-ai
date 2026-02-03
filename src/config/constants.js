module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'admin',
    HOST: 'host',
    PLAYER: 'player',
    UMPIRE: 'umpire',
    VIEWER: 'viewer'
  },

  // User Account Status
  ACCOUNT_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
    PENDING_VERIFICATION: 'pending_verification'
  },

  // Match Status
  MATCH_STATUS: {
    SCHEDULED: 'scheduled',
    TOSS: 'toss',
    IN_PROGRESS: 'in_progress',
    INNINGS_BREAK: 'innings_break',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
    CANCELLED: 'cancelled'
  },

  // Room Status
  ROOM_STATUS: {
    WAITING: 'waiting',
    ROLE_SELECTION: 'role_selection',
    TEAM_SETUP: 'team_setup',
    READY: 'ready',
    IN_MATCH: 'in_match',
    COMPLETED: 'completed',
    CLOSED: 'closed'
  },

  // Room Participant Roles (for 3-player rooms)
  ROOM_ROLES: {
    UMPIRE: 'umpire',
    TEAM_A_INCHARGE: 'team_a_incharge',
    TEAM_B_INCHARGE: 'team_b_incharge'
  },

  // Innings Status
  INNINGS_STATUS: {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
  },

  // Ball Outcomes
  BALL_OUTCOMES: {
    DOT: 'dot',
    ONE: '1',
    TWO: '2',
    THREE: '3',
    FOUR: '4',
    SIX: '6',
    WIDE: 'wide',
    NO_BALL: 'no_ball',
    BYE: 'bye',
    LEG_BYE: 'leg_bye',
    WICKET: 'wicket'
  },

  // Dismissal Types
  DISMISSAL_TYPES: {
    BOWLED: 'bowled',
    CAUGHT: 'caught',
    CAUGHT_AND_BOWLED: 'caught_and_bowled',
    RUN_OUT: 'run_out',
    STUMPED: 'stumped',
    LBW: 'lbw',
    HIT_WICKET: 'hit_wicket',
    RETIRED_HURT: 'retired_hurt',
    OBSTRUCTING_FIELD: 'obstructing_field',
    TIMED_OUT: 'timed_out',
    HANDLED_BALL: 'handled_ball'
  },

  // Toss Decisions
  TOSS_DECISIONS: {
    BAT: 'bat',
    BOWL: 'bowl'
  },

  // Match Results
  MATCH_RESULTS: {
    TEAM_A_WON: 'team_a_won',
    TEAM_B_WON: 'team_b_won',
    TIE: 'tie',
    NO_RESULT: 'no_result',
    ABANDONED: 'abandoned'
  },

  // Default Configuration
  DEFAULTS: {
    OVERS: parseInt(process.env.DEFAULT_OVERS) || 6,
    PLAYERS_PER_TEAM: parseInt(process.env.DEFAULT_PLAYERS_PER_TEAM) || 6,
    MAX_PARTICIPANTS_PER_ROOM: 3, // Fixed: Creator + 2 friends
    BALLS_PER_OVER: 6
  },

  // Validation Limits
  VALIDATION: {
    USERNAME_MIN: 3,
    USERNAME_MAX: 30,
    PASSWORD_MIN: 8,
    PASSWORD_MAX: 128,
    NAME_MIN: 2,
    NAME_MAX: 50,
    ROOM_NAME_MIN: 3,
    ROOM_NAME_MAX: 50,
    TEAM_NAME_MIN: 2,
    TEAM_NAME_MAX: 30,
    DESCRIPTION_MAX: 500
  },

  // OTP Configuration
  OTP: {
    LENGTH: parseInt(process.env.OTP_LENGTH) || 6,
    EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    MAX_ATTEMPTS: 3
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Socket Events
  SOCKET_EVENTS: {
    // Connection
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',

    // Room Events
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    ROOM_UPDATE: 'room_update',
    PLAYER_JOINED: 'player_joined',
    PLAYER_LEFT: 'player_left',

    // Match Events
    MATCH_START: 'match_start',
    MATCH_END: 'match_end',
    TOSS_RESULT: 'toss_result',
    INNINGS_START: 'innings_start',
    INNINGS_END: 'innings_end',

    // Scoring Events
    BALL_UPDATE: 'ball_update',
    SCORE_UPDATE: 'score_update',
    WICKET: 'wicket',
    OVER_COMPLETE: 'over_complete',

    // User Events
    JOIN_USER_ROOM: 'join_user_room',
    LEAVE_USER_ROOM: 'leave_user_room',

    // Notification Events
    NOTIFICATION: 'notification',
    NOTIFICATIONS_READ: 'notifications_read',

    // Friend Events
    FRIEND_REQUEST_RECEIVED: 'friend_request_received',
    FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',
    FRIEND_REQUEST_REJECTED: 'friend_request_rejected',
    FRIEND_REMOVED: 'friend_removed',
    USER_BLOCKED: 'user_blocked',
    USER_UNBLOCKED: 'user_unblocked',

    // Error Events
    ERROR: 'error'
  },

  // Friendship Status
  FRIENDSHIP_STATUS: {
    NONE: 'none',
    FRIENDS: 'friends',
    REQUEST_SENT: 'request_sent',
    REQUEST_RECEIVED: 'request_received',
    BLOCKED: 'blocked',
    BLOCKED_BY: 'blocked_by'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    FRIEND_REQUEST: 'friend_request',
    FRIEND_ACCEPTED: 'friend_accepted',
    FRIEND_REJECTED: 'friend_rejected',
    FRIEND_REMOVED: 'friend_removed',
    USER_BLOCKED: 'user_blocked',
    USER_UNBLOCKED: 'user_unblocked',
    MATCH_INVITATION: 'match_invitation',
    MATCH_STARTED: 'match_started',
    MATCH_ENDED: 'match_ended',
    ROOM_INVITATION: 'room_invitation',
    SYSTEM: 'system'
  }
};
