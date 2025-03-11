const { body } = require('express-validator');

/**
 * Validators utility
 * Contains validation functions used across the application
 */

/**
 * Validates if a string is a proper account number format
 * @param {string} accountNumber - The account number to validate
 * @param {string} [bankPrefix] - Optional bank prefix to check against
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidAccountNumber(accountNumber, bankPrefix = null) {
    // Basic checks
    if (!accountNumber || typeof accountNumber !== 'string') {
        return false;
    }

    // Check length
    if (accountNumber.length < 10 || accountNumber.length > 30) {
        return false;
    }

    // Check format - alphanumeric only
    if (!/^[a-zA-Z0-9]+$/.test(accountNumber)) {
        return false;
    }

    // If bank prefix provided, check if the account starts with it
    if (bankPrefix && !accountNumber.startsWith(bankPrefix)) {
        return false;
    }

    return true;
}

/**
 * Validates if a number is a valid currency amount
 * @param {number} amount - The amount to check
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidAmount(amount) {
    // Must be a number
    if (typeof amount !== 'number') {
        return false;
    }

    // Must be positive
    if (amount <= 0) {
        return false;
    }

    // Must have at most 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
        return false;
    }

    return true;
}

/**
 * Validates if the given value is a supported currency
 * @param {string} currency - The currency code to check
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidCurrency(currency) {
    const supportedCurrencies = ['EUR', 'USD', 'GBP'];
    return supportedCurrencies.includes(currency);
}

/**
 * Validates JWT payload structure for B2B transactions
 * @param {object} payload - The JWT payload
 * @returns {object} - { isValid: boolean, error: string|null }
 */
function validateTransactionPayload(payload) {
    if (!payload) {
        return { isValid: false, error: 'Missing payload' };
    }

    const requiredFields = ['accountFrom', 'accountTo', 'currency', 'amount', 'explanation', 'senderName'];
    
    for (const field of requiredFields) {
        if (!payload[field]) {
            return { isValid: false, error: `Missing required field: ${field}` };
        }
    }

    if (!isValidAccountNumber(payload.accountFrom)) {
        return { isValid: false, error: 'Invalid source account format' };
    }

    if (!isValidAccountNumber(payload.accountTo)) {
        return { isValid: false, error: 'Invalid destination account format' };
    }

    if (!isValidCurrency(payload.currency)) {
        return { isValid: false, error: 'Unsupported currency' };
    }

    if (!isValidAmount(payload.amount)) {
        return { isValid: false, error: 'Invalid amount' };
    }

    return { isValid: true, error: null };
}

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
  validateTransaction,
  isValidAccountNumber,
  isValidAmount,
  isValidCurrency,
  validateTransactionPayload
};
