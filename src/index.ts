import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import itemRoutes from './routes/item.routes';
import logger from './utils/logger';

dotenv.config();

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.stack });
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 