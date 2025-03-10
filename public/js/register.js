document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                username, 
                password, 
                fullName, 
                email 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Registration successful, redirect to login
            window.location.href = '/login.html';
        } else {
            errorMessage.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
    }
});
