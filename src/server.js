// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pino from 'pino-http';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3030;

//Middleware
app.use(cors()); // Enable CORS
// Middleware for parsing JSON
app.use(express.json());
app.use(
  pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{req.method} {req.url} {res.statusCode} - {responseTime}ms',
        hideObject: true,
      },
    },
  }),
);

// First route
app.get('/notes', (req, res) => {
  res.status(200).json({ message: 'Retrieved all notes' });
});

// Notes for userid
app.get('/notes/:userId', (req, res) => {
  const { userId } = req.params;
  res.status(200).json({ message: `Retrieved note with ID: ${userId}` });
});

app.post('/notes', (req, res) => {
  console.log(req.body); // Log the request body to the console
  res.status(201).json({ message: 'Note created' });
});

// Route to demonstrate error handling
app.get('/test-error', (req, res) => {
  // Example error
  throw new Error('Simulated server error');
});

// Middleware 404 (`Not Found`)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Middleware for handling errors
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
