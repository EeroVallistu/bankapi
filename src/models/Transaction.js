const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./db');

class Transaction extends Model {}

Transaction.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  fromAccount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  toAccount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['EUR', 'USD', 'GBP']]
    }
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'inProgress', 'completed', 'failed']]
    }
  },
  senderName: {
    type: DataTypes.STRING
  },
  receiverName: {
    type: DataTypes.STRING
  },
  isExternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  bankPrefix: {
    type: DataTypes.STRING
  },
  errorMessage: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'transaction',
  timestamps: true,
  hooks: {
    beforeUpdate: (transaction) => {
      transaction.updatedAt = new Date();
    }
  }
});

module.exports = Transaction;
