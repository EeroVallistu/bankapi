/**
 * Currency utility for handling exchange rates and conversions
 */

// Exchange rates relative to EUR (base currency)
// In a production app, these would come from an external API
const exchangeRates = {
    EUR: 1.0,      // Base currency
    USD: 1.09,     // 1 EUR = 1.09 USD
    GBP: 0.86      // 1 EUR = 0.86 GBP
};

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - The converted amount
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) {
        return amount;
    }
    
    // Validate currencies
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
        throw new Error(`Unsupported currency: ${!exchangeRates[fromCurrency] ? fromCurrency : toCurrency}`);
    }
    
    // Convert to EUR first (as base currency)
    const amountInEur = amount / exchangeRates[fromCurrency];
    
    // Then convert from EUR to target currency
    const convertedAmount = amountInEur * exchangeRates[toCurrency];
    
    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
}

/**
 * Get the current exchange rate between two currencies
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - The exchange rate
 */
function getExchangeRate(fromCurrency, toCurrency) {
    // Validate currencies
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
        throw new Error(`Unsupported currency: ${!exchangeRates[fromCurrency] ? fromCurrency : toCurrency}`);
    }
    
    // Calculate the exchange rate
    return exchangeRates[toCurrency] / exchangeRates[fromCurrency];
}

/**
 * Format currency amount for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted amount with currency symbol
 */
function formatCurrency(amount, currency) {
    const symbols = {
        EUR: '€',
        USD: '$',
        GBP: '£'
    };
    
    // Default formatting if currency not supported
    if (!symbols[currency]) {
        return `${amount} ${currency}`;
    }
    
    // Format with proper symbol placement and thousand separators
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'symbol'
    });
    
    return formatter.format(amount);
}

/**
 * Get all supported currencies
 * @returns {string[]} - Array of supported currency codes
 */
function getSupportedCurrencies() {
    return Object.keys(exchangeRates);
}

module.exports = {
    convertCurrency,
    getExchangeRate,
    formatCurrency,
    getSupportedCurrencies
};
