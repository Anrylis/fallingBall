const express = require('express');
const { Client } = require('pg'); // 引入 PostgreSQL 驅動
const app = express();
const port = process.env.PORT || 3000;

// 連接到 PostgreSQL 資料庫
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('PostgreSQL Connected'))
  .catch(err => console.log(err));

// 設定靜態檔案服務
app.use(express.static('public'));

// 解析 JSON 請求
app.use(express.json());

// 建立用戶資料表（如果資料表不存在）
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    realname VARCHAR(100) NOT NULL,
    nickname VARCHAR(100) NOT NULL UNIQUE,
    score INTEGER DEFAULT 0
  );
`;

client.query(createTableQuery)
  .then(() => console.log('Players table created or already exists'))
  .catch(err => console.log(err));

// 唤醒接口
app.post('/wakeup', (req, res) => {
    res.send('"ok!"');
});

// 檢查真名和暱稱是否唯一
app.get('/checkUnique', async (req, res) => {
    const { realname, nickname } = req.query;
    try {
        const result = await client.query(
            'SELECT * FROM players WHERE realname = $1 OR nickname = $2',
            [realname, nickname]
        );
        if (result.rows.length > 0) {
            return res.json({ error: 'The real name or nickname is already taken.' });
        }
        res.json({ exists: false });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 創建新帳號
app.post('/createAccount', async (req, res) => {
    const { realname, nickname, score } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO players (realname, nickname, score) VALUES ($1, $2, $3) RETURNING *',
            [realname, nickname, score]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error creating account' });
    }
});

// 獲取玩家分數
app.get('/getScore', async (req, res) => {
    const { nickname } = req.query;
    try {
        const result = await client.query(
            'SELECT score FROM players WHERE nickname = $1',
            [nickname]
        );
        if (result.rows.length > 0) {
            return res.json({ score: result.rows[0].score });
        }
        res.status(404).json({ error: 'Player not found' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 更新玩家分數
app.post('/updateScore', async (req, res) => {
    const { nickname, score } = req.body;
    try {
        const result = await client.query(
            'UPDATE players SET score = GREATEST(score, $1) WHERE nickname = $2 RETURNING *',
            [score, nickname]
        );
        if (result.rows.length > 0) {
            return res.json(result.rows[0]);
        }
        res.status(404).json({ error: 'Player not found' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 獲取排行榜
app.get('/leaderboard', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM players ORDER BY score DESC');
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
