import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Business Logic Service is running' });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    service: 'business-logic',
    timestamp: new Date().toISOString()
  });
});

// Routes
import itemRoutes from './routes/items';
import categoryRoutes from './routes/categories';
import lendingRoutes from './routes/lending';
import reservationRoutes from './routes/reservations';
import organizationRoutes from './routes/organizations';
import configurationRoutes from './routes/configurations';
import csvRoutes from './routes/csv';
import notificationRoutes from './routes/notifications';
import emailQueueRoutes from './routes/email-queue';
import backgroundJobsRoutes from './routes/background-jobs';
import feedbackRoutes from './routes/feedback';
import approvalRoutes from './routes/approvals';
import itemHistoryRoutes from './routes/item-history';
import waitlistRoutes from './routes/waitlist';
import userPreferenceRoutes from './routes/user-preferences';

// Apply audit logger middleware to all routes
app.use(auditLogger);

app.use('/items', itemRoutes);
app.use('/categories', categoryRoutes);
app.use('/lending', lendingRoutes);
app.use('/reservations', reservationRoutes);
app.use('/organizations', organizationRoutes);
app.use('/configurations', configurationRoutes);
app.use('/csv', csvRoutes);
app.use('/notifications', notificationRoutes);
app.use('/email-queue', emailQueueRoutes);
app.use('/background-jobs', backgroundJobsRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/approvals', approvalRoutes);
app.use('/item-history', itemHistoryRoutes);
app.use('/waitlist', waitlistRoutes);
app.use('/user-preferences', userPreferenceRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Business Logic Service running on port ${PORT}`);
});