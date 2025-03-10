// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// Initialize dashboard
async function initDashboard() {
    await fetchAndDisplayAccounts();
}

// Fetch and display accounts
async function fetchAndDisplayAccounts() {
    try {
        const response = await fetch('/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch accounts');
        }

        const data = await response.json();
        displayAccounts(data.data);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        // Handle error (show message to user)
    }
}

// Display accounts in grid
function displayAccounts(accounts) {
    const accountsList = document.getElementById('accountsList');
    if (!accounts || accounts.length === 0) {
        accountsList.innerHTML = '<p>No accounts found. Create your first account!</p>';
        return;
    }
    
    accountsList.innerHTML = accounts.map(account => `
        <div class="account-card">
            <div class="account-name">${account.name}</div>
            <div class="account-number">${account.accountNumber}</div>
            <div class="account-balance">${account.balance.toFixed(2)}</div>
            <div class="account-currency">${account.currency}</div>
        </div>
    `).join('');
}

// Create new account
async function createAccount() {
    try {
        // Add input validation
        const supportedCurrencies = ['EUR', 'USD', 'GBP'];
        let currency = prompt('Enter currency (EUR, USD, or GBP):');
        
        if (!currency || !supportedCurrencies.includes(currency.toUpperCase())) {
            alert('Please enter a valid currency (EUR, USD, or GBP)');
            return;
        }
        
        let name = prompt('Enter account name:');
        if (!name || name.length < 2) {
            alert('Please enter a valid account name (minimum 2 characters)');
            return;
        }

        // Normalize inputs
        currency = currency.toUpperCase();
        name = name.trim();

        const response = await fetch('/accounts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currency, name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create account');
        }

        // Success message
        alert('Account created successfully!');
        
        // Refresh accounts list
        await fetchAndDisplayAccounts();
    } catch (error) {
        console.error('Error creating account:', error);
        alert(error.message || 'Failed to create account. Please try again.');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Initialize dashboard when page loads
initDashboard();
