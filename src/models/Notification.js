const mongoose = require('mongoose');

const NOTIFICATION_TYPES = {
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
  SYSTEM: 'system',
  CUSTOM: 'custom',
  ADMIN_BROADCAST: 'admin_broadcast'
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: {
        values: Object.values(NOTIFICATION_TYPES),
        message: 'Invalid notification type'
      },
      required: [true, 'Notification type is required']
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    richContent: {
      imageUrl: {
        type: String,
        validate: {
          validator: function(v) {
            if (!v) return true;
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
          },
          message: 'Invalid image URL format'
        }
      },
      iconUrl: {
        type: String,
        validate: {
          validator: function(v) {
            if (!v) return true;
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
          },
          message: 'Invalid icon URL format'
        }
      },
      actionButton: {
        text: {
          type: String,
          maxlength: [30, 'Action button text cannot exceed 30 characters']
        },
        link: {
          type: String,
          maxlength: [500, 'Action button link cannot exceed 500 characters']
        }
      },
      deepLink: {
        type: String,
        maxlength: [500, 'Deep link cannot exceed 500 characters']
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: 'Priority must be one of: low, normal, high, urgent'
      },
      default: 'normal'
    },
    category: {
      type: String,
      enum: {
        values: ['friend', 'match', 'room', 'system', 'custom', 'admin'],
        message: 'Category must be one of: friend, match, room, system, custom, admin'
      },
      default: 'system'
    },
    metadata: {
      sentByAdmin: {
        type: Boolean,
        default: false
      },
      broadcastId: String,
      viewedAt: Date
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
notificationSchema.index({ type: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ priority: 1, category: 1 });
notificationSchema.index({ 'metadata.sentByAdmin': 1 });

/**
 * Static method to create notification and populate sender
 */
notificationSchema.statics.createNotification = async function (data) {
  const notification = await this.create(data);
  return notification.populate('sender', 'username firstName lastName avatar');
};

/**
 * Static method to get unread count for a user
 */
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

/**
 * Static method to get notifications with pagination
 */
notificationSchema.statics.getNotifications = async function (
  userId,
  { skip = 0, limit = 20, unreadOnly = false }
) {
  const query = { recipient: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username firstName lastName avatar'),
    this.countDocuments(query)
  ]);

  return { notifications, total };
};

/**
 * Static method to get filtered notifications by category and priority
 */
notificationSchema.statics.getFilteredNotifications = async function (
  userId,
  { skip = 0, limit = 20, unreadOnly = false, categories = [], priorities = [] }
) {
  const query = { recipient: userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (categories && categories.length > 0) {
    query.category = { $in: categories };
  }

  if (priorities && priorities.length > 0) {
    query.priority = { $in: priorities };
  }

  const [notifications, total] = await Promise.all([
    this.find(query)
      .sort({ priority: -1, createdAt: -1 })  // High priority first, then newest
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username firstName lastName avatar'),
    this.countDocuments(query)
  ]);

  return { notifications, total };
};

/**
 * Instance method to mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

/**
 * Instance method to mark notification as viewed (different from read)
 */
notificationSchema.methods.markAsViewed = async function () {
  if (!this.metadata) {
    this.metadata = {};
  }
  if (!this.metadata.viewedAt) {
    this.metadata.viewedAt = new Date();
    await this.save();
  }
  return this;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
