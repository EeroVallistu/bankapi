const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const centralBankService = require('./centralBankService');
const keyManager = require('../utils/keyManager');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

class TransactionService {
  // Add new utility method for validating account prefixes
  validateAccountPrefix(accountNumber, expectedPrefix = null) {
    const prefix = accountNumber.substring(0, 3);
    if (expectedPrefix && prefix !== expectedPrefix) {
      throw new Error(`Invalid account prefix. Expected: ${expectedPrefix}, Got: ${prefix}`);
    }
    return prefix;
  }

  // Add method to validate transaction payload
  validateTransactionPayload(payload) {
    const requiredFields = ['accountFrom', 'accountTo', 'currency', 'amount', 'explanation', 'senderName'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!['EUR', 'USD', 'GBP'].includes(payload.currency)) {
      throw new Error('Unsupported currency');
    }

    if (payload.amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return true;
  }

  async processInternalTransaction(fromAccount, toAccount, amount, explanation, userId) {
    // Check if source account belongs to user
    const sourceAccount = await Account.findOne({ 
      where: {
        accountNumber: fromAccount,
        userId
      }
    });
    
    if (!sourceAccount) {
      throw new Error('Source account not found or doesn\'t belong to you');
    }

    // Check if destination account exists
    const destinationAccount = await Account.findOne({ 
      where: { accountNumber: toAccount }
    });
    
    if (!destinationAccount) {
      throw new Error('Destination account not found');
    }

    // Check if source account has sufficient funds
    if (sourceAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Find source account owner for sender name
    const sourceUser = await User.findByPk(sourceAccount.userId);
    // Find destination account owner for receiver name
    const destinationUser = await User.findByPk(destinationAccount.userId);

    // Create transaction record
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

    try {
      // Update transaction status
      await transaction.update({ status: 'inProgress' });

      // Update account balances
      await sourceAccount.update({ balance: sourceAccount.balance - amount });
      await destinationAccount.update({ balance: destinationAccount.balance + amount });

      // Mark transaction as completed
      await transaction.update({ status: 'completed' });

      return transaction;
    } catch (error) {
      // Handle failure
      await transaction.update({ 
        status: 'failed',
        errorMessage: error.message
      });
      
      throw error;
    }
  }

  // Enhanced method for external transactions
  async processExternalTransaction(fromAccount, toAccount, amount, explanation, userId) {
    let transaction = null;
    try {
      // Create preliminary transaction
      transaction = await this.createPreliminaryTransaction(fromAccount, toAccount, amount, explanation, userId);

      // Get destination bank details with retry
      const bankDetails = await this.getDestinationBankWithRetry(toAccount);
      
      // Create and sign JWT
      const jwtToken = await this.createSignedTransactionJWT(transaction);
      
      // Send transaction with retry mechanism
      const response = await this.sendTransactionWithRetry(bankDetails.transactionUrl, jwtToken);
      
      // Process successful response
      await this.finalizeTransaction(transaction, response);
      
      return transaction;
    } catch (error) {
      await this.handleTransactionError(transaction, error);
      throw error;
    }
  }

  async createSignedTransactionJWT(transaction) {
    try {
      const payload = {
        accountFrom: transaction.fromAccount,
        accountTo: transaction.toAccount,
        currency: transaction.currency,
        amount: transaction.amount,
        explanation: transaction.explanation,
        senderName: transaction.senderName,
        timestamp: new Date().toISOString()
      };

      return jwt.sign(payload, keyManager.getPrivateKey(), {
        algorithm: 'RS256',
        header: {
          typ: 'JWT',
          alg: 'RS256',
          kid: '1'  // Key ID matching JWKS
        }
      });
    } catch (error) {
      throw new Error(`JWT signing failed: ${error.message}`);
    }
  }

  async sendTransactionWithRetry(url, jwt, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwt })
        });

        if (!response.ok) {
          throw new Error(`Bank responded with status: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          continue;
        }
      }
    }
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  // New method for creating signed JWT
  async createSignedJWT(payload) {
    try {
      return jwt.sign(payload, keyManager.getPrivateKey(), {
        algorithm: 'RS256',
        header: {
          typ: 'JWT',
          alg: 'RS256',
          kid: '1'
        }
      });
    } catch (error) {
      console.error('JWT signing failed:', error);
      throw new Error('Failed to create transaction JWT');
    }
  }

  // New method for sending transaction to other bank
  async sendTransactionToBank(url, jwt) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jwt })
      });

      if (!response.ok) {
        throw new Error(`Bank responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Transaction sending failed:', error);
      throw new Error('Failed to send transaction to destination bank');
    }
  }

  // New method for processing incoming transactions
  async processIncomingTransaction(jwt) {
    try {
      // Decode JWT to get sender's bank
      const decoded = jwt.decode(jwt, { complete: true });
      if (!decoded) {
        throw new Error('Invalid JWT format');
      }

      // Get sender bank's public key and verify JWT
      const bankPrefix = this.validateAccountPrefix(decoded.payload.accountFrom);
      const bankDetails = await centralBankService.getBankDetails(bankPrefix);
      
      if (!bankDetails) {
        throw new Error('Sender bank not found');
      }

      // Verify JWT signature
      const publicKey = await centralBankService.getPublicKey(bankDetails.jwksUrl);
      jwt.verify(jwt, publicKey, { algorithms: ['RS256'] });

      // Validate payload
      this.validateTransactionPayload(decoded.payload);

      // Process the transaction
      const result = await this.processVerifiedIncomingTransaction(decoded.payload);

      return result;
    } catch (error) {
      console.error('Incoming transaction processing failed:', error);
      throw error;
    }
  }

  // Helper method for processing verified incoming transactions
  async processVerifiedIncomingTransaction(payload) {
    const { accountTo, amount, currency } = payload;

    // Find and validate destination account
    const destAccount = await Account.findOne({ where: { accountNumber: accountTo }});
    if (!destAccount) {
      throw new Error('Destination account not found');
    }

    // Convert currency if needed
    const convertedAmount = currency !== destAccount.currency 
      ? await this.convertCurrency(amount, currency, destAccount.currency)
      : amount;

    // Credit the account
    await destAccount.increment('balance', { by: convertedAmount });

    // Create transaction record
    const transaction = await Transaction.create({
      ...payload,
      status: 'completed',
      isExternal: true
    });

    // Get receiver's name
    const receiver = await User.findByPk(destAccount.userId);

    return {
      transaction,
      receiverName: receiver.fullName
    };
  }

  async updateTransactionStatus(transaction, newStatus, errorMessage = null) {
    const timestamp = new Date().toISOString();
    const statusUpdate = {
      status: newStatus,
      timestamp,
      errorMessage
    };

    const history = transaction.statusHistory;
    history.push(statusUpdate);

    await transaction.update({
      status: newStatus,
      statusHistory: history,
      errorMessage,
      updatedAt: timestamp
    });
  }

  async processIncomingTransaction(payload) {
    const transaction = await Transaction.create({
      ...payload,
      status: 'pending',
      isExternal: true
    });

    try {
      await this.updateTransactionStatus(transaction, 'inProgress');
      
      // Validate destination account
      const destAccount = await Account.findOne({
        where: { accountNumber: payload.accountTo }
      });
      
      if (!destAccount) {
        throw new Error('Destination account not found');
      }

      // Credit the account
      await destAccount.increment('balance', { by: payload.amount });
      
      await this.updateTransactionStatus(transaction, 'completed');
      
      const receiver = await User.findByPk(destAccount.userId);
      
      return {
        receiverName: receiver.fullName,
        transaction
      };
    } catch (error) {
      await this.updateTransactionStatus(transaction, 'failed', error.message);
      throw error;
    }
  }
}

module.exports = new TransactionService();
