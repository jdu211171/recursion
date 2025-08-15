import express, { Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { initMinioClient } from './services/minioService';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3002;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve OpenAPI spec and Redocly docs
app.get('/openapi.yaml', (_req, res) => {
  const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
  res.type('application/yaml').sendFile(specPath);
});

// Aliases to support Vite proxy prefix (/api/files/docs)
app.get('/files/openapi.yaml', (_req, res) => {
  const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
  res.type('application/yaml').sendFile(specPath);
});

app.get('/docs', (_req, res) => {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>File Storage API Docs</title>
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

app.get('/files/docs', (_req, res) => {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>File Storage API Docs</title>
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
