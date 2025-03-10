// This is a simple mock implementation of currency conversion
// In a production environment, this would connect to an external API

const exchangeRates = {
  EUR: { 
    USD: 1.10, 
    GBP: 0.85, 
    EUR: 1 
  },
  USD: { 
    EUR: 0.91, 
    GBP: 0.77, 
    USD: 1 
  },
  GBP: { 
    EUR: 1.18, 
    USD: 1.30, 
    GBP: 1 
  }
};

/**
 * Convert amount from one currency to another
 * 
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - Converted amount
 */
const convertCurrency = (amount, fromCurrency, toCurrency) => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Check if we have exchange rates for these currencies
  if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }
  
  // Apply conversion
  const rate = exchangeRates[fromCurrency][toCurrency];
  const converted = amount * rate;
  
  // Return rounded to 2 decimal places
  return Math.round(converted * 100) / 100;
};

/**
 * Get all available currency codes
 * 
 * @returns {string[]} - Array of currency codes
 */
const getSupportedCurrencies = () => {
  return Object.keys(exchangeRates);
};

/**
 * Get exchange rate between two currencies
 * 
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - Exchange rate
 */
const getExchangeRate = (fromCurrency, toCurrency) => {
  if (!exchangeRates[fromCurrency] || !exchangeRates[fromCurrency][toCurrency]) {
    throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
  }
  
  return exchangeRates[fromCurrency][toCurrency];
};

module.exports = {
  convertCurrency,
  getSupportedCurrencies,
  getExchangeRate
};
