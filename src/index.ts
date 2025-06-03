import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import profileRoutes from './routes/profile.routes';
import logger from './utils/logger';

dotenv.config();

const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
  .then(() => {
    logger.info('Database connection established successfully');
  })
  .catch((error) => {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  });

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        server: 'running'
      },
      error: 'Database connection failed'
    });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/profile', profileRoutes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.stack });
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing database connection...');
  await prisma.$disconnect();
  process.exit(0);
}); 