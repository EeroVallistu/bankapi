require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const helmet = require('helmet'); // Add security headers
const rateLimit = require('express-rate-limit'); // Add rate limiting

const { sequelize, testConnection } = require('./models/db');
const { userRoutes, sessionRoutes } = require('./routes/auth'); // Split auth routes into users and sessions
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const b2bRoutes = require('./routes/b2b');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

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
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));

app.options('*', cors()); // Enable pre-flight for all routes

app.use(express.json());

// API versioning
const API_VERSION = 'v1';

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
        description: 'Current server',
      },
      {
        url: `/api/${API_VERSION}`,
        description: 'API with version prefix',
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
    version: API_VERSION,
    timestamp: new Date().toISOString()
  });
});

// Apply API routes with version prefix
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transactionRoutes);

// B2B routes remain without /api prefix for compatibility
app.use('/transfers', b2bRoutes);

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
app.use(errorHandler);

// Sync database and start server
sequelize.sync({ alter: true })
  .then(async () => {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/docs`);
    });
  })
  .catch(err => {
    console.error('Unable to sync database:', err);
    process.exit(1);
  });

module.exports = app; // Export for testing
