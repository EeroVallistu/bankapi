const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const keyManager = require('../utils/keyManager');
const centralBankService = require('../services/centralBankService');

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
  try {
    const { jwt: jwtToken } = req.body;
    
    if (!jwtToken) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'JWT is required' 
      });
    }

    // Decode JWT without verification to extract claims
    const decodedToken = jwt.decode(jwtToken, { complete: true });
    if (!decodedToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JWT format'
      });
    }

    // Extract payload
    const { 
      accountFrom, 
      accountTo, 
      currency, 
      amount, 
      explanation, 
      senderName 
    } = decodedToken.payload;

    // Check if destination account exists
    const destinationAccount = await Account.findOne({
      where: { accountNumber: accountTo }
    });
    
    if (!destinationAccount) {
      return res.status(404).json({
        status: 'error',
        message: 'Destination account not found'
      });
    }

    // Extract bank prefix from source account
    const bankPrefix = accountFrom.substring(0, 3);

    try {
      // Get the source bank details
      const bankDetails = await centralBankService.getBankDetails(bankPrefix);
      if (!bankDetails) {
        return res.status(400).json({
          status: 'error',
          message: 'Source bank not recognized'
        });
      }

      // Get the source bank's public key
      const jwks = await centralBankService.getPublicKey(bankDetails.jwksUrl);
      if (!jwks) {
        return res.status(400).json({
          status: 'error',
          message: 'Unable to fetch source bank public key'
        });
      }

      // Verify JWT signature
      try {
        // Create public key in PEM format from JWK
        const publicKey = {
          key: Buffer.from(jwks.n, 'base64url').toString('base64'),
          format: 'jwk'
        };

        // Verify JWT
        jwt.verify(jwtToken, publicKey, {
          algorithms: ['RS256']
        });
      } catch (verifyError) {
        console.error('JWT verification error:', verifyError);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid JWT signature'
        });
      }

      // Get destination account owner for receiver name
      const destinationUser = await User.findByPk(destinationAccount.userId);
      if (!destinationUser) {
        return res.status(500).json({
          status: 'error',
          message: 'Error finding account owner'
        });
      }

      // Create transaction record
      const transaction = await Transaction.create({
        fromAccount: accountFrom,
        toAccount: accountTo,
        amount,
        currency,
        explanation,
        senderName,
        receiverName: destinationUser.fullName,
        bankPrefix,
        isExternal: true,
        status: 'inProgress'
      });

      // Credit destination account
      await destinationAccount.update({
        balance: destinationAccount.balance + amount
      });

      // Update transaction status
      await transaction.update({ status: 'completed' });

      // Return response with receiver name
      return res.status(200).json({
        receiverName: destinationUser.fullName
      });
    } catch (error) {
      console.error('B2B transaction processing error:', error);
      return res.status(500).json({
        status: 'error',
        message: `Error processing transaction: ${error.message}`
      });
    }
  } catch (error) {
    console.error('B2B endpoint error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error processing request'
    });
  }
});

// Add JWKS endpoint
/**
 * @swagger
 * /transactions/keys:
 *   get:
 *     summary: Get bank's JSON Web Key Set
 *     tags: [Bank-to-Bank]
 *     security: []
 *     responses:
 *       200:
 *         description: JWKS with bank's public keys
 *       500:
 *         description: Error retrieving keys
 */
router.get('/keys', (req, res) => {
  try {
    const keyManager = require('../utils/keyManager');
    keyManager.ensureKeysExist();
    const jwks = keyManager.getJwks();
    res.status(200).json(jwks);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving JWKS'
    });
  }
});

module.exports = router;
