const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const centralBankService = require('./centralBankService');
const keyManager = require('../utils/keyManager');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

class TransactionService {
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

  async processExternalTransaction(fromAccount, toAccount, amount, explanation, userId) {
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

    // Check if source account has sufficient funds
    if (sourceAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    // Extract bank prefix from toAccount
    const bankPrefix = toAccount.substring(0, 3);
    
    // Verify this is actually an external transaction
    if (bankPrefix === process.env.BANK_PREFIX) {
      throw new Error('For internal transfers use /internal endpoint');
    }

    // Find source account owner
    const sourceUser = await User.findByPk(sourceAccount.userId);

    // Create transaction record
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

    try {
      // Get destination bank details
      const bankDetails = await centralBankService.getBankDetails(bankPrefix);
      
      if (!bankDetails) {
        throw new Error('Destination bank not found');
      }

      // Update transaction status
      await transaction.update({ status: 'inProgress' });

      // Prepare transaction payload
      const payload = {
        accountFrom: fromAccount,
        accountTo: toAccount,
        currency: sourceAccount.currency,
        amount,
        explanation,
        senderName: sourceUser.fullName
      };

      // Create JWT
      const jwtToken = jwt.sign(
        payload,
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
        await transaction.update({ receiverName: result.receiverName });
      }

      // Update source account balance
      await sourceAccount.update({ balance: sourceAccount.balance - amount });

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

  async processIncomingTransaction(jwtToken) {
    // Decode JWT without verification first
    const decodedToken = jwt.decode(jwtToken, { complete: true });
    if (!decodedToken) {
      throw new Error('Invalid JWT format');
    }

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
      throw new Error('Destination account not found');
    }

    // Extract bank prefix from source account
    const bankPrefix = accountFrom.substring(0, 3);

    // Get the source bank details
    const bankDetails = await centralBankService.getBankDetails(bankPrefix);
    if (!bankDetails) {
      throw new Error('Source bank not recognized');
    }

    // Get the source bank's public key
    const jwks = await centralBankService.getPublicKey(bankDetails.jwksUrl);
    if (!jwks) {
      throw new Error('Unable to fetch source bank public key');
    }

    // Verify JWT signature
    try {
      // Create public key in PEM format from JWK
      const publicKey = {
        kty: jwks.kty,
        n: jwks.n,
        e: jwks.e
      };

      // Verify JWT
      jwt.verify(jwtToken, publicKey, {
        algorithms: ['RS256']
      });
    } catch (verifyError) {
      throw new Error(`Invalid JWT signature: ${verifyError.message}`);
    }

    // Get destination account owner
    const destinationUser = await User.findByPk(destinationAccount.userId);
    if (!destinationUser) {
      throw new Error('Error finding account owner');
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
    await destinationAccount.update({ balance: destinationAccount.balance + amount });

    // Update transaction status
    await transaction.update({ status: 'completed' });

    return {
      transaction,
      receiverName: destinationUser.fullName
    };
  }
}

module.exports = new TransactionService();
