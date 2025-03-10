const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accountNumber: {
    type: DataTypes.STRING,
    unique: {
      msg: 'Account number must be unique'
    },
    allowNull: false,
    validate: {
      startsWith(value) {
        if (!value.startsWith(process.env.BANK_PREFIX)) {
          throw new Error('Account number must start with correct bank prefix');
        }
      }
    }
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false,
    get() {
      const value = this.getDataValue('balance');
      return value === null ? null : parseFloat(value);
    },
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR',
    allowNull: false,
    validate: {
      isIn: [['EUR', 'USD', 'GBP']]
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Main Account'
  }
}, {
  tableName: 'Accounts',
  timestamps: true,
  hooks: {
    beforeUpdate: async (account) => {
      if (account.changed('balance') && account.balance < 0) {
        throw new Error('Account balance cannot be negative');
      }
    }
  }
});

Account.generateAccountNumber = () => {
  const prefix = process.env.BANK_PREFIX || '353';
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
};

module.exports = Account;
