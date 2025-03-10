const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const keyManager = require('../utils/keyManager');
const centralBankService = require('../services/centralBankService');
const fetch = require('node-fetch');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /transfers:
 *   get:
 *     summary: Get all transactions for the user
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user transactions
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    // Get user accounts
    const accounts = await Account.findAll({ 
      where: { userId: req.user.id },
      attributes: ['accountNumber']
    });
    
    const accountNumbers = accounts.map(acc => acc.accountNumber);
    
    // Find transactions where user is sender or receiver
    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          { fromAccount: { [Op.in]: accountNumbers } },
          { toAccount: { [Op.in]: accountNumbers } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching transactions'
    });
  }
});

/**
 * @swagger
 * /transfers/internal:
 *   post:
 *     summary: Create a new internal transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccount
 *               - toAccount
 *               - amount
 *               - explanation
 *             properties:
 *               fromAccount:
 *                 type: string
 *                 example: 353c8b72e4a9f15d3b82
 *               toAccount:
 *                 type: string
 *                 example: 353f9a23d1c7b45e8t91
 *               amount:
 *                 type: number
 *                 example: 150.00
 *               explanation:
 *                 type: string
 *                 example: Rent payment for January
 *     responses:
 *       201:
 *         description: Transaction created successfully
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
 *                     fromAccount:
 *                       type: string
 *                       example: 353c8b72e4a9f15d3b82
 *                     toAccount:
 *                       type: string
 *                       example: 353f9a23d1c7b45e8t91
 *                     amount:
 *                       type: number
 *                       example: 150.00
 *                     currency:
 *                       type: string
 *                       example: EUR
 *                     explanation:
 *                       type: string
 *                       example: Rent payment for January
 *                     status:
 *                       type: string
 *                       example: completed
 *       400:
 *         description: Validation error
 *       402:
 *         description: Insufficient funds
 *       404:
 *         description: Account not found
 */
router.post(
  '/internal',
  [
    body('fromAccount').notEmpty().withMessage('Source account is required'),
    body('toAccount').notEmpty().withMessage('Destination account is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('explanation').notEmpty().withMessage('Explanation is required'),
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

      const { fromAccount, toAccount, amount, explanation } = req.body;

      // Check if source account belongs to user
      const sourceAccount = await Account.findOne({ 
        where: {
          accountNumber: fromAccount,
          userId: req.user.id
        }
      });
      
      if (!sourceAccount) {
        return res.status(404).json({
          status: 'error',
          message: 'Source account not found or doesn\'t belong to you'
        });
      }

      // Check if destination account exists in our bank
      const destinationAccount = await Account.findOne({ 
        where: { accountNumber: toAccount }
      });
      
      if (!destinationAccount) {
        return res.status(404).json({
          status: 'error',
          message: 'Destination account not found'
        });
      }

      // Check if source account has sufficient funds
      if (sourceAccount.balance < amount) {
        return res.status(402).json({
          status: 'error',
          message: 'Insufficient funds'
        });
      }

      // Find source account owner for the sender name
      const sourceUser = await User.findByPk(sourceAccount.userId);
      // Find destination account owner for the receiver name
      const destinationUser = await User.findByPk(destinationAccount.userId);

      // Create a transaction
      const transaction = await Transaction.create({
        fromAccount,
        toAccount,
        amount,
        currency: sourceAccount.currency,
        explanation,
        senderName: sourceUser.fullName,
        receiverName: destinationUser.fullName,
        isExternal: false,
        status: 'pending'
      });

      // Update transaction status to in-progress
      await transaction.update({ status: 'inProgress' });

      // Update balances
      await sourceAccount.update({ balance: sourceAccount.balance - amount });
      await destinationAccount.update({ balance: destinationAccount.balance + amount });

      // Complete the transaction
      await transaction.update({ status: 'completed' });

      res.status(201).json({
        status: 'success',
        data: transaction
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating transaction'
      });
    }
  }
);

/**
 * @swagger
 * /transfers/external:
 *   post:
 *     summary: Create a new external transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccount
 *               - toAccount
 *               - amount
 *               - explanation
 *             properties:
 *               fromAccount:
 *                 type: string
 *               toAccount:
 *                 type: string
 *               amount:
 *                 type: number
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Validation error
 *       402:
 *         description: Insufficient funds
 *       404:
 *         description: Account not found
 */
router.post(
  '/external',
  [
    body('fromAccount').notEmpty().withMessage('Source account is required'),
    body('toAccount').notEmpty().withMessage('Destination account is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('explanation').notEmpty().withMessage('Explanation is required'),
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

      const { fromAccount, toAccount, amount, explanation } = req.body;

      // Check if source account belongs to user
      const sourceAccount = await Account.findOne({ 
        where: {
          accountNumber: fromAccount,
          userId: req.user.id
        }
      });
      
      if (!sourceAccount) {
        return res.status(404).json({
          status: 'error',
          message: 'Source account not found or doesn\'t belong to you'
        });
      }

      // Check if source account has sufficient funds
      if (sourceAccount.balance < amount) {
        return res.status(402).json({
          status: 'error',
          message: 'Insufficient funds'
        });
      }

      // Extract the bank prefix from toAccount (first 3 characters)
      const bankPrefix = toAccount.substring(0, 3);
      
      // Check if this is actually an external transaction
      if (bankPrefix === process.env.BANK_PREFIX) {
        return res.status(400).json({
          status: 'error',
          message: 'For internal transfers please use /internal endpoint'
        });
      }

      // Find source account owner for the sender name
      const sourceUser = await User.findByPk(sourceAccount.userId);

      // Create a transaction
      const transaction = await Transaction.create({
        fromAccount,
        toAccount,
        amount,
        currency: sourceAccount.currency,
        explanation,
        senderName: sourceUser.fullName,
        bankPrefix,
        isExternal: true,
        status: 'pending'
      });

      // Save the transaction
      await transaction.save();

      try {
        // Get destination bank details
        const bankDetails = await centralBankService.getBankDetails(bankPrefix);
        
        if (!bankDetails) {
          transaction.status = 'failed';
          transaction.errorMessage = 'Destination bank not found';
          await transaction.save();
          
          return res.status(404).json({
            status: 'error',
            message: 'Destination bank not found'
          });
        }

        // Update transaction status to in-progress
        transaction.status = 'inProgress';
        await transaction.save();

        // Prepare payload for B2B transaction
        const payload = {
          accountFrom: fromAccount,
          accountTo: toAccount,
          currency: sourceAccount.currency,
          amount,
          explanation,
          senderName: sourceUser.fullName
        };

        // Sign the payload
        const signature = keyManager.sign(payload);
        
        // Create JWT
        const jwtToken = jwt.sign(
          { ...payload },
          { key: keyManager.getPrivateKey(), passphrase: '' },
          { 
            algorithm: 'RS256',
            header: {
              alg: 'RS256',
              kid: '1'
            }
          }
        );

        // Send to destination bank
        const response = await fetch(bankDetails.transactionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ jwt: jwtToken })
        });

        if (!response.ok) {
          throw new Error(`Destination bank responded with status: ${response.status}`);
        }

        const result = await response.json();
        
        // Update receiver name if provided
        if (result && result.receiverName) {
          transaction.receiverName = result.receiverName;
        }

        // Update balances
        sourceAccount.balance -= amount;
        await sourceAccount.save();

        // Complete the transaction
        transaction.status = 'completed';
        await transaction.save();

        res.status(201).json({
          status: 'success',
          data: transaction
        });
      } catch (error) {
        // Transaction failed
        console.error('External transfer error:', error);
        
        transaction.status = 'failed';
        transaction.errorMessage = error.message;
        await transaction.save();
        
        res.status(500).json({
          status: 'error',
          message: `External transfer failed: ${error.message}`
        });
      }
    } catch (error) {
      console.error('Error creating external transaction:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating external transaction'
      });
    }
  }
);

/**
 * @swagger
 * /transfers/{id}:
 *   get:
 *     summary: Get transaction details
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaction not found'
      });
    }
    
    // Get user accounts
    const accounts = await Account.findAll({ 
      where: { userId: req.user.id },
      attributes: ['accountNumber']
    });
    
    const accountNumbers = accounts.map(acc => acc.accountNumber);
    
    // Check if user is involved in this transaction
    if (!accountNumbers.includes(transaction.fromAccount) && !accountNumbers.includes(transaction.toAccount)) {
      return res.status(403).json({
        status: 'error',
        message: 'You don\'t have access to this transaction'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching transaction'
    });
  }
});

module.exports = router;
