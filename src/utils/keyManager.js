const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_DIR = path.join(__dirname, '../../keys');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

const privateKeyPath = path.join(KEYS_DIR, 'private.pem');
const publicKeyPath = path.join(KEYS_DIR, 'public.pem');

// Generate keys if they don't exist
function ensureKeysExist() {
  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    console.log('Generating new RSA key pair...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log('RSA key pair generated successfully');
  }
}

// Get private key
function getPrivateKey() {
  ensureKeysExist();
  return fs.readFileSync(privateKeyPath, 'utf8');
}

// Get public key
function getPublicKey() {
  ensureKeysExist();
  return fs.readFileSync(publicKeyPath, 'utf8');
}

// Get JWKS format
function getJwks() {
  ensureKeysExist();
  const publicKey = getPublicKey();
  
  // Extract the PEM key and create a JWKS
  const pem = publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n/g, '');
  const jwk = {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid: '1',
    n: Buffer.from(pem, 'base64').toString('base64url'),
    e: 'AQAB'
  };
  
  return {
    keys: [jwk]
  };
}

// Sign data with private key
function sign(data) {
  const privateKey = getPrivateKey();
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(JSON.stringify(data));
  return sign.sign(privateKey, 'base64');
}

// Verify signature with public key
function verify(data, signature, publicKey) {
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(JSON.stringify(data));
  return verify.verify(publicKey, signature, 'base64');
}

module.exports = {
  getPrivateKey,
  getPublicKey,
  getJwks,
  sign,
  verify,
  ensureKeysExist
};
