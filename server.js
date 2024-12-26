// 匯入必要的模組
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let leaderboard = []; // 存儲玩家數據

// 喚醒伺服器
app.post('/wakeup', (req, res) => {
  res.send({ message: 'Server is awake!' });
});

// 玩家登入
app.post('/load', (req, res) => {
  const { user, name } = req.body;
  if (!user || !name) {
    return res.status(400).send({ error: 'Invalid input' });
  }

  const existingUser = leaderboard.find((player) => player.name === name);
  if (existingUser) {
    return res.status(400).send({ error: 'Nickname already taken' });
  }

  leaderboard.push({ user, name, score: 0 });
  res.send({ message: 'Player registered' });
});

// 更新分數
app.post('/score', (req, res) => {
  const { name, score } = req.body;
  const player = leaderboard.find((player) => player.name === name);
  if (!player) {
    return res.status(404).send({ error: 'Player not found' });
  }

  player.score = Math.max(player.score, score); // 更新最高分
  res.send({ message: 'Score updated' });
});

// 獲取排行榜
app.get('/leaderboard', (req, res) => {
  const sortedLeaderboard = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // 返回前10名
  res.send(sortedLeaderboard);
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
