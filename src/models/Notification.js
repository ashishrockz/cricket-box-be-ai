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
  SYSTEM: 'system'
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

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
