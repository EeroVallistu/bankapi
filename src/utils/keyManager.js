const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class KeyManager {
    constructor() {
        this.keysDir = path.join(__dirname, '../../keys');
        this.privateKeyPath = path.join(this.keysDir, 'private.pem');
        this.publicKeyPath = path.join(this.keysDir, 'public.pem');
        
        // Ensure the keys directory exists
        this.ensureDir();
    }

    /**
     * Ensure the keys directory exists
     */
    ensureDir() {
        if (!fs.existsSync(this.keysDir)) {
            fs.mkdirSync(this.keysDir, { recursive: true });
        }
    }

    /**
     * Check if keys exist and generate if they don't
     */
    ensureKeysExist() {
        if (!fs.existsSync(this.privateKeyPath) || !fs.existsSync(this.publicKeyPath)) {
            this.generateKeys();
        }
    }

    /**
     * Generate new RSA key pair
     */
    generateKeys() {
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
        
        fs.writeFileSync(this.privateKeyPath, privateKey);
        fs.writeFileSync(this.publicKeyPath, publicKey);
        
        console.log('RSA key pair generated successfully.');
    }

    /**
     * Get the private key
     * @returns {string} Private key in PEM format
     */
    getPrivateKey() {
        this.ensureKeysExist();
        return fs.readFileSync(this.privateKeyPath, 'utf8');
    }

    /**
     * Get the public key
     * @returns {string} Public key in PEM format
     */
    getPublicKey() {
        this.ensureKeysExist();
        return fs.readFileSync(this.publicKeyPath, 'utf8');
    }

    /**
     * Sign data with the private key
     * @param {object|string} data - Data to sign
     * @returns {string} Base64 signature
     */
    sign(data) {
        const privateKey = this.getPrivateKey();
        const sign = crypto.createSign('SHA256');
        
        if (typeof data === 'object') {
            sign.update(JSON.stringify(data));
        } else {
            sign.update(data);
        }
        
        return sign.sign(privateKey, 'base64');
    }

    /**
     * Verify signature with the public key
     * @param {object|string} data - Original data
     * @param {string} signature - Base64 signature to verify
     * @returns {boolean} Whether the signature is valid
     */
    verify(data, signature) {
        const publicKey = this.getPublicKey();
        const verify = crypto.createVerify('SHA256');
        
        if (typeof data === 'object') {
            verify.update(JSON.stringify(data));
        } else {
            verify.update(data);
        }
        
        return verify.verify(publicKey, signature, 'base64');
    }

    /**
     * Get JSON Web Key Set (JWKS) representation of the public key
     * @returns {object} JWKS object
     */
    getJwks() {
        this.ensureKeysExist();
        
        // Get the public key in PEM format
        const publicKeyPem = this.getPublicKey();
        
        // Parse the key to get components
        const key = crypto.createPublicKey(publicKeyPem);
        const keyData = key.export({ format: 'jwk' });
        
        // Build the JWKS
        return {
            keys: [{
                kty: keyData.kty,
                n: keyData.n,
                e: keyData.e,
                alg: 'RS256',
                use: 'sig',
                kid: '1'
            }]
        };
    }
}

module.exports = new KeyManager();
