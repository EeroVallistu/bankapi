const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const keyManager = require('../utils/keyManager');
const centralBankService = require('../services/centralBankService');
const cache = require('../middleware/cache');

/**
 * @swagger
 * /transfers/incoming:
 *   post:
 *     summary: Process incoming transfer
 *     tags: [Bank-to-Bank]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jwt
 *             properties:
 *               jwt:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJhY2NvdW50RnJvbSI6IjUxMmE3YjIzYzRkNWU2ZjdnODkwIiwiYWNjb3VudFRvIjoiMzUzYzhiNzJlNGE5ZjE1ZDNiODIiLCJjdXJyZW5jeSI6IkVVUiIsImFtb3VudCI6MzAwLjAwLCJleHBsYW5hdGlvbiI6IkludmVzdG1lbnQgcmV0dXJuIiwic2VuZGVyTmFtZSI6IkFsaWNlIEpvaG5zb24ifQ.signature
 *     responses:
 *       200:
 *         description: Transaction processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receiverName:
 *                   type: string
 *                   example: John Smith
 *       400:
 *         description: Invalid JWT or signature
 *       404:
 *         description: Destination account not found
 *       500:
 *         description: Processing error
 */
router.post('/incoming', async (req, res) => {
  let transaction = null;
  try {
    const { jwt: token } = req.body;
    if (!token) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'JWT token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Decode and validate JWT structure
    const decoded = await this.validateJWTStructure(token);
    
    // Validate sending bank and get its public key
    const publicKey = await this.validateSenderBank(decoded);
    
    // Verify JWT signature
    await this.verifyJWTSignature(token, publicKey);
    
    // Process the transaction
    const result = await transactionService.processIncomingTransaction(decoded.payload);
    
    res.json({
      status: 'success',
      receiverName: result.receiverName,
      transactionId: result.transaction.id
    });
  } catch (error) {
    await this.handleIncomingTransactionError(transaction, error);
    
    const errorResponse = {
      status: 'error',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };

    res.status(error.status || 500).json(errorResponse);
  }
});

// Add better JWKS endpoint with caching
router.get('/jwks.json', cache('5 minutes'), (req, res) => {
  try {
    const jwks = keyManager.getJwks();
    res.set('Cache-Control', 'public, max-age=300');
    res.json(jwks);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving JWKS',
      code: 'JWKS_ERROR'
    });
  }
});

module.exports = router;
