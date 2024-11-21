const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();
const { createClient } = require('redis');

const app = express();
const PORT = 3002;

console.log('Environment Variables:', process.env);

const db = mysql.createConnection({
  host: 'localhost',
  user: 'exampleuser',
  password: 'examplepassword',
  database: 'exampledb',
});

db.connect((err) => {
  if (err)
  {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL');
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err.message);
  }
})();

// Routes
app.get('/', async (req, res) => {
  try {
    // Set a value in Redis
    await redisClient.set('welcome', 'Hello, Redis!');
    const message = await redisClient.get('welcome');

    res.send({
      message,
      mysql_status: 'Connected',
      redis_status: 'Connected',
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});