const { sequelize } = require('./db');
const User = require('./User');
const Account = require('./Account');

// Define associations
User.hasMany(Account, {
  foreignKey: 'userId',
  as: 'accounts',
  onDelete: 'CASCADE'
});

Account.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Sync database based on environment
const syncDatabase = async () => {
  try {
    // In development, check if we should preserve data
    if (process.env.NODE_ENV === 'development' && process.env.FORCE_DB_RESET === 'true') {
      // Only force sync when explicitly requested
      await sequelize.sync({ 
        force: true,
        hooks: false,
        logging: false
      });
      console.log('Database tables recreated (all data cleared)');
      
      // Create a default admin user for testing
      await createDefaultUser();
    } else {
      // Normal sync - preserves existing data
      await sequelize.sync({ 
        alter: true,  // This will apply schema changes but preserve data
        logging: false 
      });
      console.log('Database synchronized (preserving existing data)');
    }
  } catch (error) {
    console.error('Database sync error:', error);
    throw error;
  }
};

// Helper to create a default user for testing
const createDefaultUser = async () => {
  try {
    const defaultUser = await User.create({
      username: 'admin',
      password: 'password',  // NEVER use simple passwords in production!
      fullName: 'Administrator',
      email: 'admin@example.com',
      sessions: []
    });
    console.log('Default user created:', defaultUser.username);
  } catch (error) {
    console.error('Failed to create default user:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Account,
  syncDatabase
};
