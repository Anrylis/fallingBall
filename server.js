const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

// 用於存儲玩家分數的臨時陣列 
let leaderboard = [];
let users = {};  // 存儲用戶資料

// 使用 CORS，允許跨域請求
app.use(cors());

// 使用 JSON 解析請求體
app.use(bodyParser.json());

// 首頁顯示
app.get('/', (req, res) => {
    res.send('Server is running');
});

// 叫醒服務器
app.post('/wakeup', (req, res) => {
    res.send('"hello"');
});

// 獲取并更新玩家分數
app.post('/load', (req, res) => {
    const { user, name } = req.body;

    if (!user || !name) {
        return res.status(400).send('User or name missing');
    }

    if (!users[user]) {
        users[user] = { name, score: 0 };  // 初始化用戶
    }

    return res.json({ score: users[user].score });
});

// 更新分數
app.post('/update-score', (req, res) => {
    const { user, score } = req.body;

    if (!user || score == undefined) {
        return res.status(400).send('Invalid request');
    }

    if (!users[user]) {
        return res.status(404).send('User not found');
    }

    // 更新用戶分數
    users[user].score = score;

    // 更新排行榜
    leaderboard = Object.values(users).sort((a, b) => b.score - a.score);

    res.send('Score updated');
});

// 獲取排行榜
app.get('/leaderboard', (req, res) => {
    res.json(leaderboard);
});

// 登入狀態檢查
app.get('/islogin', (req, res) => {
    const user = req.query.user;
    if (user && users[user]) {
        return res.send('1');  // 已登錄
    }
    res.send('0');  // 未登錄
});

// 獲取當前分數
app.get('/myscore', (req, res) => {
    const user = req.query.user;
    if (user && users[user]) {
        return res.send(users[user].score.toString());
    }
    res.status(404).send('User not found');
});

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
