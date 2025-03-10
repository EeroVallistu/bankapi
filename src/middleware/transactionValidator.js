const { body } = require('express-validator');

const validateTransaction = [
  body('fromAccount')
    .notEmpty()
    .withMessage('Source account is required')
    .matches(/^[0-9a-zA-Z]+$/)
    .withMessage('Invalid account number format'),
  
  body('toAccount')
    .notEmpty()
    .withMessage('Destination account is required')
    .matches(/^[0-9a-zA-Z]+$/)
    .withMessage('Invalid account number format'),
  
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('Amount must be greater than 0'),
  
  body('currency')
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Invalid currency')
];

module.exports = validateTransaction;
