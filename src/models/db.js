const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../', process.env.DATABASE_PATH || 'database.sqlite'),
  logging: false,
  pool: {
    max: 1,        // Minimum connections
    min: 0,
    acquire: 3000, // Faster timeout
    idle: 1000     // Faster idle
  },
  dialectOptions: {
    timeout: 1000, // Faster timeout
  },
  define: {
    timestamps: true,
    underscored: true
  }
});

// Super quick connection test
const testConnection = async () => {
  try {
    await sequelize.authenticate({ timeout: 1000 });
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection
};
