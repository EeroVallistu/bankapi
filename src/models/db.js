const { Sequelize } = require('sequelize');
const path = require('path');

// Get database path from environment or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');

// Create Sequelize instance
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Test connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
};
