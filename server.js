// 匯入必要的模組
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let leaderboard = []; // 存儲玩家數據

// 讓伺服器返回 HTML 登入頁面
app.get('/', (req, res) => {
  res.send(htmlPage);  // 返回登入頁面 HTML
});

// 喚醒伺服器
app.post('/wakeup', (req, res) => {
  res.send({ message: 'Server is awake!' });
});

// 玩家登入
app.post('/load', (req, res) => {
    const { user, name } = req.body;

    // 檢查用戶名和暱稱是否有效，避免重複登錄或資料錯誤
    if (!user || !name) {
        return res.status(400).send({ message: "Invalid name or user data" });
    }

    // 如果用戶已經存在，更新資料
    let userIndex = leaderboard.findIndex(player => player.name === user);

    if (userIndex !== -1) {
        // 用戶已存在，更新暱稱，如果有需要的話
        leaderboard[userIndex].nickname = name;
    } else {
        // 如果用戶不存在，新增用戶並初始化分數為 0
        leaderboard.push({ name: user, nickname: name, score: 0 });
    }

    res.send({ status: 'ok', message: 'Player data loaded' });
});

// 更新分數
app.post('/score', (req, res) => {
  const { name, score } = req.body;
  
  // 檢查是否提供了有效的分數
  if (!name || score === undefined) {
    return res.status(400).send({ message: "Invalid score data" });
  }

  // 查找玩家並更新分數
  const player = leaderboard.find((player) => player.name === name);
  if (!player) {
    return res.status(404).send({ error: 'Player not found' });
  }

  // 更新分數，選擇最高分
  player.score = Math.max(player.score, score); // 保證分數為最高分
  res.send({ message: 'Score updated' });
});

// 獲取排行榜
app.get('/leaderboard', (req, res) => {
  const sortedLeaderboard = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // 返回前10名
  res.send(sortedLeaderboard);
});

// 預設 HTML 頁面
const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Score Leaderboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f0f0f0; padding: 20px; }
        #loading { font-size: 24px; text-align: center; }
        #input-form, #leaderboard { display: none; margin-top: 20px; }
        input, button { margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px; width: 100%; }
        button { background: #6200ea; color: white; cursor: pointer; }
        button:hover { background: #3700b3; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #fff; }
        th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
        .highlight { background: #ffe082; }
    </style>
</head>
<body>
    <div id="loading">Loading...</div>
    <div id="input-form">
        <h2>Sign In</h2>
        <input type="text" id="realname" placeholder="Enter your real name" required>
        <input type="text" id="nickname" placeholder="Enter your nickname" required>
        <button id="submit">Submit</button>
    </div>
    <div id="leaderboard">
        <h2>Leaderboard</h2>
        <table>
            <thead>
                <tr><th>#</th><th>Name</th><th>Score</th></tr>
            </thead>
            <tbody id="leaderboard-body"></tbody>
        </table>
    </div>
    <script>
        const apiUrl = 'https://fallingball.onrender.com';
        let userName = "", userNickname = "";

        async function wakeUpServer() {
            try {
                const response = await fetch(apiUrl + '/wakeup', { method: 'POST' });
                if (response.ok) {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('input-form').style.display = 'block';
                } else {
                    console.error("Failed to wake up server");
                }
            } catch (error) {
                console.error("Server wake-up error:", error);
            }
        }

        document.getElementById('submit').onclick = async () => {
            userName = document.getElementById('realname').value;
            userNickname = document.getElementById('nickname').value;
            if (userName && userNickname) {
                try {
                    const response = await fetch(apiUrl + '/load' , {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user: userName, name: userNickname })
                    });
                    if (response.ok) {
                        document.getElementById('input-form').style.display = 'none';
                        document.getElementById('leaderboard').style.display = 'block';
                        updateLeaderboard();
                        setInterval(updateLeaderboard, 10000); // 每10秒刷新
                    } else {
                        alert("Invalid nickname or user data!");
                    }
                } catch (error) {
                    console.error("Submit error:", error);
                }
            } else {
                alert("Please fill in both fields!");
            }
        };

        async function updateLeaderboard() {
            try {
                const response = await fetch(apiUrl + '/leaderboard');
                const data = await response.json();
                data.sort((a, b) => b.score - a.score);

                const tbody = document.getElementById('leaderboard-body');
                tbody.innerHTML = ""; // 清空現有內容

                let rank = 1;
                data.forEach(user => {
                    const row = document.createElement('tr');
                   row.innerHTML = "<td>" + rank + "</td><td>" + user.name + "</td><td>" + user.score + "</td>";
                    if (user.name === userNickname) row.classList.add('highlight');
                    tbody.appendChild(row);
                    rank++;
                });
            } catch (error) {
                console.error("Leaderboard update error:", error);
            }
        }

        window.onload = wakeUpServer;
    </script>
</body>
</html>
`;


// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
