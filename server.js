const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();

// 使用環境變數設置端口（Render 預設使用環境變數指定端口）
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL 連接池
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to the database');
  }
});

app.post('/wakeup', (req, res) => {
  res.status(200).json('hello');
});

// 載入或新增使用者資料
app.post('/load', async (req, res) => {
  const { user, name } = req.body;
  if (!user || !name) {
    return res.status(400).send('User and name are required');
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [user]);
    if (result.rows.length > 0) {
      if (result.rows[0].name !== name) {
        return res.status(403).send('Name does not match for the provided user');
      }
      res.status(200).json(result.rows[0]);
    } else {
      const insertResult = await pool.query('INSERT INTO users (username, name, score) VALUES ($1, $2, 0) RETURNING *', [user, name]);
      res.status(201).json(insertResult.rows[0]);
    }
  } catch (err) {
    console.error('Error loading user:', err);
    res.status(500).send('Server error');
  }
});

// 返回排行榜資料
app.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, score FROM users ORDER BY score DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).send('Server error');
  }
});

// 設定伺服器監聽埠
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
