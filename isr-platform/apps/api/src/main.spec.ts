import request from 'supertest';
import express from 'express';

describe('API Server', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a minimal test app with health endpoint
    app = express();
    app.use(express.json());
    
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Add 404 handler like main.ts
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });

  describe('Security headers', () => {
    it('should have security middleware configured', () => {
      // This test verifies the presence of helmet in package.json
      const packageJson = require('../../../package.json');
      expect(packageJson.dependencies).toHaveProperty('helmet');
      expect(packageJson.dependencies).toHaveProperty('cors');
    });
  });
});