require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import database and models first
const { sequelize } = require('./models/db');
const { User, Account, syncDatabase } = require('./models');

// Then import routes
const { userRoutes, sessionRoutes } = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const b2bRoutes = require('./routes/b2b');
const errorHandler = require('./middleware/errorHandler');

// Import new info route
const infoRoute = require('./routes/info');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static('public'));

// Security middleware
app.use(helmet());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all requests
app.use(apiLimiter);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true, // Enable credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); // Enable pre-flight for all routes

app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bank API',
      version: '1.0.0',
      description: 'Bank API with interoperability features',
      contact: {
        name: 'API Support',
        email: 'support@eerovallistu.site'
      }
    },
    servers: [
      {
        url: `/`,
        description: 'Current server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'error'
                  },
                  message: {
                    type: 'string',
                    example: 'Authentication required'
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Input validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'error'
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string'
                        },
                        message: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API status endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'API is operational',
    timestamp: new Date().toISOString()
  });
});

// Apply API routes
app.use('/users', userRoutes);
app.use('/sessions', sessionRoutes);
app.use('/accounts', accountRoutes);
app.use('/transfers', transactionRoutes);
app.use('/transfers', b2bRoutes); // B2B routes remain without version prefix

// Add bank info route
app.use('/bank-info', infoRoute);

// JWKS endpoint (public)
app.get('/jwks.json', (req, res) => {
  try {
    const keyManager = require('./utils/keyManager');
    // Ensure keys exist
    keyManager.ensureKeysExist();
    // Get JWKS representation
    const jwks = keyManager.getJwks();
    res.status(200).json(jwks);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving JWKS',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Modified startup sequence
const startServer = async () => {
  try {
    // First connect to database
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Then sync database schema
    await syncDatabase();
    console.log('Database synchronized.');

    // Finally start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://127.0.0.1:${PORT}`);
      console.log('Try making a test request to /health endpoint');
      console.log(`API documentation available at http://127.0.0.1:${PORT}/docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // Export for testing
