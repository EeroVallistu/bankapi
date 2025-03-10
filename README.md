# Bank API

A secure banking API with interbank transaction capabilities, following the Central Bank interoperability specifications.

## Features

- User registration and authentication
- Multiple accounts per user with different currencies
- Internal transactions between accounts
- External transactions between banks
- Secure key management and JWT signing
- API documentation with Swagger UI

## Setup

### Prerequisites

- Node.js (v14+)
- npm or yarn
- SQLite3

### Local Development

1. Clone the repository
```bash
git clone https://github.com/yourusername/bankapi.git
cd bankapi
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
DATABASE_PATH=./database.sqlite
JWT_SECRET=your_jwt_secret_here
CENTRAL_BANK_URL=https://centralbank-api.com
BANK_NAME=Your Bank Name
BANK_PREFIX=YBP
API_KEY=your_api_key_here
TRANSACTION_URL=https://yourbank.com/transactions/b2b
JWKS_URL=https://yourbank.com/jwks.json
TEST_MODE=false
```

4. Start the server
```bash
npm start
```

For development mode with auto-reload:
```bash
npm run dev
```

### Deployment on Debian 12 with Nginx

This repository includes deployment scripts for Debian 12 with Nginx.

1. Set up a Debian 12 server with SSH access
2. Copy the repository to the server
3. Navigate to the deployment directory
```bash
cd bankapi/deployment
```

4. Make the setup script executable and run it
```bash
chmod +x debian-setup.sh
sudo ./debian-setup.sh
```

The script will:
- Install Node.js, SQLite, Nginx, and Certbot
- Create a database directory
- Set up the application files
- Create a systemd service for the application
- Configure Nginx as a reverse proxy
- Set up SSL with Let's Encrypt

After deployment, the API will be available at: `https://bank.eerovallistu.site`

## API Documentation

Once the server is running, visit `/docs` to access the Swagger UI documentation.

## Key Features Explained

### User Authentication

The API uses JWT tokens for authentication. When a user logs in successfully, a token is issued which must be included in the Authorization header for protected routes.

### Account Management

Users can create multiple accounts in different currencies. Each account is assigned a unique account number starting with the bank's prefix.

### Transaction Processing

The API supports two types of transactions:
- **Internal**: Between accounts within the same bank
- **External**: Between accounts in different banks

### Security Features

- Password hashing with bcrypt
- JWT-based authentication
- RSA key pairs for B2B transaction signing
- JWKS endpoint for public key sharing

## Bank-to-Bank Integration

This API implements the Central Bank's interoperability specifications for secure transactions between banks:

1. Each transaction is signed with the bank's private key
2. The JWT is verified by the receiving bank using the sender's public key
3. Account balances are updated only after successful verification
4. Transaction status is tracked throughout the process

## Database

The application uses SQLite as the database, with Sequelize ORM for data access:

- `users`: Stores user accounts and authentication data
- `accounts`: Stores bank accounts with balances and currency information
- `transactions`: Records all internal and external transactions

## Testing

Run the test suite:
```bash
npm test
```

To enable test mode for mocking Central Bank responses:
```
TEST_MODE=true
```

## License

MIT
