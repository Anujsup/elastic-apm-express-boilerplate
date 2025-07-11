// Start APM agent before other requires
const apm = require('elastic-apm-node').start({
    serviceName: 'express-apm-demo',
    serverUrl: 'http://localhost:8200',
    environment: 'development',
    captureBody: 'all'
});

const express = require('express');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Sample middleware to simulate delay
const simulateDelay = (req, res, next) => {
    const delay = Math.random() * 1000; // Random delay between 0-1000ms
    setTimeout(next, delay);
};

app.use(simulateDelay);

// Root endpoint
app.get('/', (req, res) => {
    console.log('Root endpoint called');
    res.json({ message: 'Hello from Express with APM!' });
});

// Endpoint that might throw an error
app.get('/error', (req, res, next) => {
    console.log('Error endpoint called');
    try {
        throw new Error('This is a test error for APM!');
    } catch (error) {
        next(error);
    }
});

// Endpoint with async operation
app.get('/async', async (req, res) => {
    console.log('Async endpoint called');
    try {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 500));
        res.json({ message: 'Async operation completed!' });
    } catch (error) {
        apm.captureError(error);
        res.status(500).json({ error: error.message });
    }
});

// CPU intensive operation
app.get('/cpu-intensive', (req, res) => {
    console.log('CPU intensive endpoint called');
    let result = 0;
    for(let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
    }
    res.json({ result });
});

// Database simulation endpoint
app.get('/db-simulation', async (req, res) => {
    console.log('DB simulation endpoint called');
    const span = apm.startSpan('database-operation');
    try {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 200));
        span.end();
        res.json({ data: 'Database query completed!' });
    } catch (error) {
        if (span) span.end();
        apm.captureError(error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error handler:', err.stack);
    apm.captureError(err);
    res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
    console.log('404 handler - Route not found:', req.url);
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Test the following endpoints:');
    console.log('1. GET / - Basic endpoint');
    console.log('2. GET /error - Generates an error');
    console.log('3. GET /async - Async operation');
    console.log('4. GET /cpu-intensive - CPU intensive operation');
    console.log('5. GET /db-simulation - Simulated database operation');
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
}); 