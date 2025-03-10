const fetch = require('node-fetch');

class CentralBankService {
  constructor() {
    this.centralBankUrl = process.env.CENTRAL_BANK_URL || 'https://henno.cfd/central-bank';
    this.apiKey = process.env.API_KEY;
    this.testMode = process.env.TEST_MODE === 'true';
  }

  async getBankDetails(bankPrefix) {
    try {
      if (this.testMode) {
        return this._mockBankResponse(bankPrefix);
      }

      const response = await fetch(`${this.centralBankUrl}/banks/${bankPrefix}`, {
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Central Bank responded with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching bank details:', error.message);
      throw error;
    }
  }

  async validateBank(bankPrefix) {
    try {
      const bankDetails = await this.getBankDetails(bankPrefix);
      return !!bankDetails;
    } catch (error) {
      console.error('Error validating bank:', error.message);
      return false;
    }
  }

  async getPublicKey(jwksUrl) {
    try {
      if (this.testMode) {
        return this._mockJwksResponse();
      }

      const response = await fetch(jwksUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }

      const jwks = await response.json();
      if (!jwks.keys || jwks.keys.length === 0) {
        throw new Error('No keys found in JWKS');
      }

      // Return the first key
      return jwks.keys[0];
    } catch (error) {
      console.error('Error fetching public key:', error.message);
      throw error;
    }
  }

  // Mock responses for testing
  _mockBankResponse(bankPrefix) {
    if (bankPrefix === process.env.BANK_PREFIX) {
      return {
        bankPrefix: process.env.BANK_PREFIX,
        name: process.env.BANK_NAME,
        transactionUrl: process.env.TRANSACTION_URL,
        jwksUrl: process.env.JWKS_URL
      };
    }

    // Mock a test bank
    return {
      bankPrefix: 'TST',
      name: 'Test Bank',
      transactionUrl: 'http://test-bank.com/transactions/b2b',
      jwksUrl: 'http://test-bank.com/jwks'
    };
  }

  _mockJwksResponse() {
    return {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: '1',
      n: 'mockKeyValue',
      e: 'AQAB'
    };
  }
}

module.exports = new CentralBankService();
