const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./db');
const { v4: uuidv4 } = require('uuid');

class Account extends Model {
  // Static method to generate account number
  static generateAccountNumber() {
    const bankPrefix = process.env.BANK_PREFIX;
    const uniqueId = uuidv4().replace(/-/g, '');
    return `${bankPrefix}${uniqueId}`;
  }
}

Account.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['EUR', 'USD', 'GBP']]
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'account',
  timestamps: true
});

module.exports = Account;
