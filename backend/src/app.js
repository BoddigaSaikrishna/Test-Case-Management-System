require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const testcasesRoutes = require('./routes/testcases');
const executionsRoutes = require('./routes/executions');
const defectsRoutes = require('./routes/defects');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const testRunnerRoutes = require('./routes/testRunner');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/testcases', testcasesRoutes);
app.use('/api/executions', executionsRoutes);
app.use('/api/defects', defectsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/test-runner', testRunnerRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
