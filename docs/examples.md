# API Example Requests and Responses

## Users

### Register User
```http
POST /users
{
  "username": "jsmith",
  "password": "securePass123!",
  "fullName": "John Smith",
  "email": "john.smith@example.com"
}
```

### Login
```http
POST /sessions
{
  "username": "jsmith",
  "password": "securePass123!"
}

Response:
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "jsmith",
    "fullName": "John Smith"
  }
}
```

## Accounts

### Create Account
```http
POST /accounts
{
  "currency": "EUR",
  "name": "Main Savings"
}

Response:
{
  "status": "success",
  "data": {
    "id": 1,
    "accountNumber": "353c8b72e4a9f15d3b82",
    "userId": 1,
    "currency": "EUR",
    "name": "Main Savings",
    "balance": 1000.00,
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### List Accounts
```http
GET /accounts

Response:
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "accountNumber": "353c8b72e4a9f15d3b82",
      "balance": 1000.00,
      "currency": "EUR",
      "name": "Main Savings"
    },
    {
      "id": 2,
      "accountNumber": "353f9a23d1c7b45e8t91",
      "balance": 500.00,
      "currency": "USD",
      "name": "Travel Account"
    }
  ]
}
```

## Transactions

### Internal Transfer
```http
POST /transfers/internal
{
  "fromAccount": "353c8b72e4a9f15d3b82",
  "toAccount": "353f9a23d1c7b45e8t91",
  "amount": 150.00,
  "explanation": "Rent payment for January"
}

Response:
{
  "status": "success",
  "data": {
    "id": 1,
    "fromAccount": "353c8b72e4a9f15d3b82",
    "toAccount": "353f9a23d1c7b45e8t91",
    "amount": 150.00,
    "currency": "EUR",
    "explanation": "Rent payment for January",
    "senderName": "John Smith",
    "receiverName": "Jane Doe",
    "status": "completed",
    "createdAt": "2024-01-20T14:25:30.000Z"
  }
}
```

### External Transfer
```http
POST /transfers/external
{
  "fromAccount": "353c8b72e4a9f15d3b82",
  "toAccount": "512a7b23c4d5e6f7g890",
  "amount": 200.00,
  "explanation": "Invoice payment #123"
}

Response:
{
  "status": "success",
  "data": {
    "id": 2,
    "fromAccount": "353c8b72e4a9f15d3b82",
    "toAccount": "512a7b23c4d5e6f7g890",
    "amount": 200.00,
    "currency": "EUR",
    "explanation": "Invoice payment #123",
    "senderName": "John Smith",
    "receiverName": "Alice Johnson",
    "status": "completed",
    "isExternal": true,
    "bankPrefix": "512",
    "createdAt": "2024-01-20T15:45:20.000Z"
  }
}
```

## Bank-to-Bank

### Incoming Transfer
```http
POST /transfers/incoming
{
  "jwt": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJhY2NvdW50RnJvbSI6IjUxMmE3YjIzYzRkNWU2ZjdnODkwIiwiYWNjb3VudFRvIjoiMzUzYzhiNzJlNGE5ZjE1ZDNiODIiLCJjdXJyZW5jeSI6IkVVUiIsImFtb3VudCI6MzAwLjAwLCJleHBsYW5hdGlvbiI6IkludmVzdG1lbnQgcmV0dXJuIiwic2VuZGVyTmFtZSI6IkFsaWNlIEpvaG5zb24ifQ.signature"
}

Response:
{
  "receiverName": "John Smith"
}
```

### JWKS Endpoint
```http
GET /transactions/keys

Response:
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "1",
      "n": "xkq35Jq_0kxY...",
      "e": "AQAB"
    }
  ]
}
```

## Common Account Number Formats

- Eero Bank (353): "353c8b72e4a9f15d3b82"
- Partner Bank (512): "512a7b23c4d5e6f7g890"
- Test Bank (999): "999t3st4cc0unt12345"

## Common Transaction Amounts

- Small payments: 10.00 - 100.00 EUR
- Regular payments: 100.00 - 1000.00 EUR
- Large payments: 1000.00 - 10000.00 EUR

## Common Transaction Types

- Rent payments
- Utility bills
- Salary transfers
- Investment payments
- Online purchases
- Service payments
