import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { initMinioClient } from './services/minioService';

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize MinIO
initMinioClient();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    service: 'file-storage',
    timestamp: new Date().toISOString()
  });
});

// Routes
import fileRoutes from './routes/files';
app.use('/files', fileRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`File Storage Service running on port ${PORT}`);
});