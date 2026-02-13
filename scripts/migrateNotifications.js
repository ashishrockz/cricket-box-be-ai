require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { Notification } = require('../src/models/Notification');

/**
 * Migration script for notification system enhancements
 * Adds notification preferences to users and updates existing notifications
 */
async function migrateNotifications() {
  try {
    console.log('Starting notification migration...\n');

    // 1. Add default notification preferences to existing users without them
    console.log('Step 1: Migrating user notification preferences...');
    const usersWithoutPreferences = await User.find({
      $or: [
        { notificationPreferences: { $exists: false } },
        { notificationPreferences: null }
      ]
    });

    console.log(`Found ${usersWithoutPreferences.length} users without notification preferences`);

    for (const user of usersWithoutPreferences) {
      user.notificationPreferences = {
        enabled: true,
        categories: {
          friend: true,
          match: true,
          room: true,
          custom: true,
          system: true
        },
        doNotDisturb: {
          enabled: false
        },
        emailNotifications: false,
        pushNotifications: true
      };
      await user.save();
    }

    console.log(`✓ Successfully updated ${usersWithoutPreferences.length} users with default preferences\n`);

    // 2. Add default category and priority to existing notifications
    console.log('Step 2: Migrating existing notifications...');
    const notificationsWithoutCategory = await Notification.find({
      $or: [
        { category: { $exists: false } },
        { priority: { $exists: false } },
        { metadata: { $exists: false } }
      ]
    });

    console.log(`Found ${notificationsWithoutCategory.length} notifications to migrate`);

    let updatedCount = 0;
    for (const notification of notificationsWithoutCategory) {
      // Infer category from type if not set
      if (!notification.category) {
        if (notification.type.includes('friend')) {
          notification.category = 'friend';
        } else if (notification.type.includes('match')) {
          notification.category = 'match';
        } else if (notification.type.includes('room')) {
          notification.category = 'room';
        } else if (notification.type === 'system') {
          notification.category = 'system';
        } else {
          notification.category = 'system';
        }
      }

      // Set default priority if not set
      if (!notification.priority) {
        notification.priority = 'normal';
      }

      // Set default metadata if not set
      if (!notification.metadata) {
        notification.metadata = {
          sentByAdmin: false
        };
      }

      await notification.save();
      updatedCount++;
    }

    console.log(`✓ Successfully updated ${updatedCount} notifications\n`);

    // 3. Display summary
    console.log('='.repeat(60));
    console.log('Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Users updated: ${usersWithoutPreferences.length}`);
    console.log(`Notifications updated: ${updatedCount}`);
    console.log('='.repeat(60));
    console.log('\n✓ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n✗ Migration failed with error:');
    console.error(error);
    throw error;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  try {
    console.log('Verifying migration results...\n');

    // Check users
    const usersWithoutPrefs = await User.countDocuments({
      $or: [
        { notificationPreferences: { $exists: false } },
        { notificationPreferences: null }
      ]
    });
    console.log(`Users without preferences: ${usersWithoutPrefs} (should be 0)`);

    // Check notifications
    const notificationsWithoutCategory = await Notification.countDocuments({
      $or: [
        { category: { $exists: false } },
        { priority: { $exists: false } }
      ]
    });
    console.log(`Notifications without category/priority: ${notificationsWithoutCategory} (should be 0)`);

    if (usersWithoutPrefs === 0 && notificationsWithoutCategory === 0) {
      console.log('\n✓ Verification passed! All records migrated successfully.\n');
    } else {
      console.log('\n⚠ Verification incomplete. Some records may need manual review.\n');
    }

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

// Run migration if executed directly
if (require.main === module) {
  const dbUri = process.env.MONGODB_URI || process.env.MONGODB_URI_TEST;

  if (!dbUri) {
    console.error('Error: MONGODB_URI environment variable not set');
    process.exit(1);
  }

  mongoose.connect(dbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Connected to MongoDB');
    console.log('Database:', dbUri.split('/').pop().split('?')[0]);
    console.log('='.repeat(60) + '\n');
    return migrateNotifications();
  }).then(() => {
    return verifyMigration();
  }).then(() => {
    return mongoose.disconnect();
  }).then(() => {
    console.log('Disconnected from MongoDB');
    console.log('\nMigration process completed.');
    process.exit(0);
  }).catch(error => {
    console.error('\nFatal error:', error);
    mongoose.disconnect();
    process.exit(1);
  });
}

module.exports = { migrateNotifications, verifyMigration };
