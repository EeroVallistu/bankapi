const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.FRONTEND_PORT || 5001;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// For any route not found in static files, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
