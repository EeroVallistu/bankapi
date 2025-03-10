// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

// Initialize page
async function initPage() {
    await loadUserAccounts();
    await loadRecentTransactions();
}

// Load user accounts into select dropdown
async function loadUserAccounts() {
    try {
        const response = await fetch('/accounts', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch accounts');
        
        const data = await response.json();
        const select = document.getElementById('fromAccount');
        
        if (!data.data || data.data.length === 0) {
            select.innerHTML = '<option value="">No accounts available</option>';
            return;
        }
        
        data.data.forEach(account => {
            const option = document.createElement('option');
            option.value = account.accountNumber;
            option.textContent = `${account.name} (${account.accountNumber}) - ${account.balance} ${account.currency}`;
            select.appendChild(option);
        });
    } catch (error) {
        showError('Failed to load accounts');
        console.error(error);
    }
}

// Load recent transactions
async function loadRecentTransactions() {
    try {
        const response = await fetch('/transfers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch transactions');
        
        const data = await response.json();
        displayTransactions(data.data || []);
    } catch (error) {
        showError('Failed to load recent transactions');
        console.error(error);
    }
}

// Display transactions in the list
function displayTransactions(transactions) {
    const list = document.getElementById('transactionsList');
    
    if (!transactions || transactions.length === 0) {
        list.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    list.innerHTML = transactions.map(tx => {
        // Determine if this is incoming or outgoing for styling
        const accounts = getAllAccountNumbers();
        const type = accounts.includes(tx.fromAccount) ? 'outgoing' : 'incoming';
        
        return `
        <div class="transaction-item">
            <div class="transaction-details">
                <div>${tx.explanation}</div>
                <div>${tx.fromAccount} → ${tx.toAccount}</div>
                <div>${new Date(tx.createdAt).toLocaleString()}</div>
                <div>Status: ${tx.status}</div>
            </div>
            <div class="transaction-amount ${type}">
                ${tx.amount} ${tx.currency}
            </div>
        </div>
        `;
    }).join('');
}

// Get all account numbers for the current user
function getAllAccountNumbers() {
    const select = document.getElementById('fromAccount');
    const accounts = [];
    
    for (let i = 0; i < select.options.length; i++) {
        accounts.push(select.options[i].value);
    }
    
    return accounts;
}

// Handle form submission
document.getElementById('transferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        fromAccount: document.getElementById('fromAccount').value,
        toAccount: document.getElementById('toAccount').value,
        amount: parseFloat(document.getElementById('amount').value),
        explanation: document.getElementById('explanation').value
    };

    try {
        // Determine if this is an internal or external transfer based on account number prefix
        // We need to fetch our bank's prefix from the server
        const bankInfo = await getBankInfo();
        const isInternal = formData.toAccount.startsWith(bankInfo.prefix);
        const endpoint = isInternal ? '/transfers/internal' : '/transfers/external';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Transfer failed');
        }

        // Show success and reset form
        showSuccess('Transfer completed successfully');
        e.target.reset();
        
        // Reload accounts and transactions
        await loadUserAccounts();
        await loadRecentTransactions();
    } catch (error) {
        showError(error.message);
        console.error('Transfer error:', error);
    }
});

// Get bank information including prefix
async function getBankInfo() {
    try {
        const response = await fetch('/bank-info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            // Default to a prefix if we can't get it from the server
            return { prefix: '353' };
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to get bank info:', error);
        // Default to a prefix if there's an error
        return { prefix: '353' };
    }
}

// Helper functions
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.color = '#d93025';
}

function showSuccess(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.color = '#34a853';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

// Initialize page
initPage();
