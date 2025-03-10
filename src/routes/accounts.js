const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Account = require('../models/Account');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Account ID
 *         accountNumber:
 *           type: string
 *           description: Unique account number with bank prefix
 *         userId:
 *           type: integer
 *           description: ID of the account owner
 *         balance:
 *           type: number
 *           format: float
 *           description: Current account balance
 *         currency:
 *           type: string
 *           enum: [EUR, USD, GBP]
 *           description: Account currency
 *         name:
 *           type: string
 *           description: Account name/description
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *       required:
 *         - accountNumber
 *         - userId
 *         - currency
 *         - name
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts for current user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Filter by currency (EUR, USD, GBP)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [balance, -balance, name, -name, createdAt, -createdAt]
 *         description: Sort accounts (prefix with - for descending)
 *     responses:
 *       200:
 *         description: List of user accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', [
  query('currency').optional().isIn(['EUR', 'USD', 'GBP']).withMessage('Invalid currency'),
  query('sort').optional().isString().withMessage('Invalid sort parameter')
], async (req, res) => {
  try {
    if (!req.user?.id) {
      throw new Error('User ID not found in request');
    }

    console.log('GET /accounts - User:', req.user.id);
    
    const accounts = await Account.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      raw: true
    });
    
    // Debug logging
    console.log('Found accounts:', JSON.stringify(accounts, null, 2));
    
    res.status(200).json({
      status: 'success',
      data: accounts || []
    });
  } catch (error) {
    console.error('Error in GET /accounts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *               - name
 *             properties:
 *               currency:
 *                 type: string
 *                 enum: [EUR, USD, GBP]
 *                 example: EUR
 *               name:
 *                 type: string
 *                 example: Main Savings
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     accountNumber:
 *                       type: string
 *                       example: 353c8b72e4a9f15d3b82
 *                     balance:
 *                       type: number
 *                       example: 1000.00
 *                     currency:
 *                       type: string
 *                       example: EUR
 *                     name:
 *                       type: string
 *                       example: Main Savings
 */

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currency
 *               - name
 *             properties:
 *               currency:
 *                 type: string
 *                 enum: [EUR, USD, GBP]
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/',
  [
    body('currency')
      .isIn(['EUR', 'USD', 'GBP'])
      .withMessage('Currency must be EUR, USD, or GBP'),
    body('name')
      .notEmpty()
      .withMessage('Account name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Account name must be between 2 and 50 characters')
      .trim()
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          status: 'error', 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { currency, name } = req.body;
      
      // Generate account number
      const accountNumber = Account.generateAccountNumber();
      
      // Create new account with explicit fields
      const account = await Account.create({
        accountNumber,
        userId: req.user.id,
        currency: currency.toUpperCase(),
        name: name.trim(),
        balance: 1000 // Starting balance for demonstration
      });
      
      res.status(201).json({
        status: 'success',
        data: account,
        message: 'Account created successfully'
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating account: ' + error.message
      });
    }
  }
);

/**
 * @swagger
 * /accounts/{accountNumber}:
 *   get:
 *     summary: Get account details
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:accountNumber', async (req, res) => {
  try {
    const account = await Account.findOne({
      where: {
        accountNumber: req.params.accountNumber,
        userId: req.user.id
      }
    });
    
    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Account not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: account
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching account'
    });
  }
});

/**
 * @swagger
 * /accounts/{accountNumber}:
 *   patch:
 *     summary: Update account details
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: New account name
 *     responses:
 *       200:
 *         description: Account updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Account not found
 */
router.patch(
  '/:accountNumber',
  [
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Account name must be between 2 and 50 characters')
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          status: 'error', 
          errors: errors.array() 
        });
      }

      const account = await Account.findOne({
        where: {
          accountNumber: req.params.accountNumber,
          userId: req.user.id
        }
      });

      if (!account) {
        return res.status(404).json({
          status: 'error',
          message: 'Account not found'
        });
      }

      // Update only allowed fields
      if (req.body.name) {
        account.name = req.body.name;
        await account.save();
      }

      res.status(200).json({
        status: 'success',
        data: account
      });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating account'
      });
    }
  }
);

module.exports = router;
