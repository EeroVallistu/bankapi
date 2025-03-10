const { body } = require('express-validator');

const validateRegistration = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
];

const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateAccountCreation = [
  body('currency')
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Currency must be EUR, USD, or GBP'),
  body('name')
    .notEmpty()
    .withMessage('Account name is required')
];

const validateTransaction = [
  body('fromAccount')
    .notEmpty()
    .withMessage('Source account is required'),
  body('toAccount')
    .notEmpty()
    .withMessage('Destination account is required'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0'),
  body('explanation')
    .notEmpty()
    .withMessage('Explanation is required'),
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateAccountCreation,
  validateTransaction
};
