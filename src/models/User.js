const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('./db');

class User extends Model {
  async comparePassword(candidatePassword) {
    return this.password === candidatePassword;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  sessions: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'user',
  timestamps: true
});

module.exports = User;
