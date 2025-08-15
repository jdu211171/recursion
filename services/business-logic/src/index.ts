import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve OpenAPI spec and Redocly docs
app.get('/openapi.yaml', (_req, res) => {
  const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
  res.type('application/yaml').sendFile(specPath);
});

// Aliases to support Vite proxy prefixes (e.g., /api/items/docs)
app.get('/:prefix/openapi.yaml', (_req, res) => {
  const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
  res.type('application/yaml').sendFile(specPath);
});

app.get('/docs', (_req, res) => {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Business Logic API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/@redocly/elements@latest/styles.min.css" />
      <style>
        body { margin: 0; height: 100vh; }
        elements-api { height: 100vh; }
        .fallback { display: none; height: 100vh; }
      </style>
    </head>
    <body>
      <elements-api
        apiDescriptionUrl="./openapi.yaml"
        router="hash"
        hide-download-button="false"
        show-curl-before-try="true"
        layout="stacked"
        try-it="true"
        theme="dark"
      ></elements-api>
      <div id="fallback" class="fallback">
        <redoc spec-url="./openapi.yaml"></redoc>
      </div>
      <script>
        (function loadElementsWithFallback() {
          function loadScript(src, onerror) {
            var s = document.createElement('script');
            s.src = src; s.async = true; s.onload = function() { window.__elementsLoaded = true; };
            if (onerror) s.onerror = onerror; document.body.appendChild(s);
          }
          // primary
          loadScript('https://unpkg.com/@redocly/elements@latest/web-components.min.js', function () {
            // fallback 1
            loadScript('https://cdn.jsdelivr.net/npm/@redocly/elements@latest/web-components.min.js', function () {
              // fallback 2 -> Redoc (no Try It)
              var fb = document.getElementById('fallback');
              fb.style.display = 'block';
              loadScript('https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js');
            });
          });
          setTimeout(function () {
            if (!window.__elementsLoaded) {
              console.warn('Redocly Elements script did not load; using fallback if available.');
            }
          }, 2500);
        })();
      </script>
    </body>
  </html>`;
  res.type('html').send(html);
});

app.get('/:prefix/docs', (_req, res) => {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Business Logic API Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/@redocly/elements@latest/styles.min.css" />
      <style>
        body { margin: 0; height: 100vh; }
        elements-api { height: 100vh; }
        .fallback { display: none; height: 100vh; }
      </style>
    </head>
    <body>
      <elements-api
        apiDescriptionUrl="./openapi.yaml"
        router="hash"
        hide-download-button="false"
        show-curl-before-try="true"
        layout="stacked"
        try-it="true"
        theme="dark"
      ></elements-api>
      <div id="fallback" class="fallback">
        <redoc spec-url="./openapi.yaml"></redoc>
      </div>
      <script>
        (function loadElementsWithFallback() {
          function loadScript(src, onerror) {
            var s = document.createElement('script');
            s.src = src; s.async = true; s.onload = function() { window.__elementsLoaded = true; };
            if (onerror) s.onerror = onerror; document.body.appendChild(s);
          }
          // primary
          loadScript('https://unpkg.com/@redocly/elements@latest/web-components.min.js', function () {
            // fallback 1
            loadScript('https://cdn.jsdelivr.net/npm/@redocly/elements@latest/web-components.min.js', function () {
              // fallback 2 -> Redoc (no Try It)
              var fb = document.getElementById('fallback');
              fb.style.display = 'block';
              loadScript('https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js');
            });
          });
          setTimeout(function () {
            if (!window.__elementsLoaded) {
              console.warn('Redocly Elements script did not load; using fallback if available.');
            }
          }, 2500);
        })();
      </script>
    </body>
  </html>`;
  res.type('html').send(html);
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
