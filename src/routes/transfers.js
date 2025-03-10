const express = require('express');
const router = express.Router();

// List all transfers
router.get('/', authenticate, async (req, res) => {
  // ...existing GET transactions logic...
});

// Create new transfer (internal or external)
router.post('/', [validateTransaction], authenticate, async (req, res) => {
  const { type = 'internal', ...transferData } = req.body;
  
  if (type === 'external') {
    // ...existing external transfer logic...
  } else {
    // ...existing internal transfer logic...
  }
});

// Get transfer details
router.get('/:id', authenticate, async (req, res) => {
  // ...existing get single transaction logic...
});

module.exports = router;
