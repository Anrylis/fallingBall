const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Score Leaderboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            padding: 20px;
        }
        #loading {
            display: block;
            font-size: 24px;
        }
        #input-form {
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        input {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            width: 80%;
        }
        button {
            padding: 10px;
            border: none;
            border-radius: 5px;
            background-color: #dd00ff;
            color: white;
            cursor: pointer;
            width: 80%;
        }
        button:hover {
            background-color: #ad00b3;
        }
        #leaderboard {
            margin-top: 20px;
            background-color: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .highlight {
            background-color: #e1ace1; /* purple */
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 10px;
            border: 1px solid #ccc;
            text-align: left;
        }
    </style>
</head>
<body>

<div id="loading">Loading...</div>

<div id="input-form" style="display:none;">
    <h2>Sign in</h2>
    <input type="text" id="user" placeholder="Your real name" required>
    <input type="text" id="name" placeholder="Nickname (Chinese isn't support)" required>
    <button id="submit">Sign up/Log in</button>
</div>

<div id="leaderboard" style="display:none;">
    <h2>~ Falling Ball Leaderboard ~</h2>
    <table>
        <thead>
            <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Score</th>
            </tr>
        </thead>
        <tbody id="leaderboard-body">
            <!-- Leaderboard data will be populated here -->
        </tbody>
    </table>
</div>

<script>
// JavaScript code
</script>

</body>
</html>
`;

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const app = express();

// 使用 bodyParser 來解析 POST 請求中的 JSON 資料，使用 cors 中間件
app.use(cors({
    origin: 'https://fallingball.onrender.com'
}));

app.use(bodyParser.json());

// 設置 PostgreSQL 連接池
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// 測試資料庫連線
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to the database');
  }
});

// 確保資料表存在
async function createTableIfNotExists() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      score INTEGER DEFAULT 0
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log("Users table is ready!");
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

// 在伺服器啟動時檢查資料表
createTableIfNotExists();

// 讓後端起床
app.post('/wakeup', async (req, res) => {
  try {
    res.status(200).json('hello');
  } catch (err) {
    console.error('Error loading user:', err);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send(htmlPage);  // 這裡返回的 html 頁面
});

// 載入或新增使用者資料
app.post('/load', async (req, res) => {
  const { user, name } = req.body;

  if (!user || !name) {
    return res.status(400).send('User and name are required');
  }

  try {
    // 查詢是否已有該使用者
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [user]);

    if (result.rows.length > 0) {
      // 如果使用者存在但名稱不符
      if (result.rows[0].name !== name) {
        return res.status(403).send('Name does not match for the provided user');
      }
      // 如果名稱符合，回傳使用者資料
      res.status(200).json(result.rows[0]);
    } else {
      // 如果使用者不存在，新增並設置 score 為 0
      const insertResult = await pool.query(
        'INSERT INTO users (username, name, score) VALUES ($1, $2, 0) RETURNING *',
        [user, name]
      );
      res.status(201).json(insertResult.rows[0]);
    }
  } catch (err) {
    console.error('Error loading user:', err);
    res.status(500).send('Server error');
  }
});

// 更新使用者的 score
app.post('/update-score', async (req, res) => {
  const { user, score } = req.body;

  if (!user || score === undefined) {
    return res.status(400).send('User and score are required');
  }

  try {  // 抓作弊
    const prev = await pool.query('SELECT * FROM users WHERE username = $1', [user]);
    if (score - prev.rows[0].score > 70) {
      return res.status(402).send('No cheating');
    }
  } catch (err) {
    console.error('Error getting score:', err);
    res.status(500).send('Server error');
  }

  try {
    // 更新指定 user 的 score
    const result = await pool.query(
      'UPDATE users SET score = $1 WHERE username = $2 RETURNING *',
      [parseInt(score), user]
    );

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error('Error updating score:', err);
    res.status(500).send('Server error');
  }
});

// 返回排行榜資料，按照 score 排序
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
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
