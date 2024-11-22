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

app.get('/products', async (req, res) => {
  const cacheKey = 'productList'; // Key for caching the product list

  try {
    // Check if the product list is in Redis cache
    const cachedProducts = await redisClient.get(cacheKey);

    if (cachedProducts) {
      // If cached data exists, return it
      console.log('Returning products from Redis cache');
      return res.json({
        source: 'redis',
        products: JSON.parse(cachedProducts),
      });
    } else {
      // If no cached data, fetch from the database
      console.log('Fetching products from MySQL database');

      db.query('SELECT * FROM products', (err, results) => {
        if (err) {
          console.error('Error fetching products from DB:', err.message);
          return res.status(500).send({ error: err.message });
        }

        // Store the product list in Redis cache for future requests
        redisClient.set(cacheKey, JSON.stringify(results), {EX:3}); // Cache for 1 hour (3600 seconds)

        // Return the product list from the database
        res.json({
          source: 'mysql',
          products: results,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching product list:', error.message);
    res.status(500).send({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});