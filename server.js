const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// 使用 bodyParser 來解析 POST 請求中的 JSON 資料，使用 cors 中間件
app.use(cors());
app.use(bodyParser.json());

let users = {}; // 用戶資料將以 { username: { name, score } } 形式儲存
let loggedInUser = null; // 追踪目前登入的用戶

// 測試路由，返回前端頁面
const htmlpage = `
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
            background-color: #e1ace1; /* purple color for highlighting */
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
    <input type="text" id="name" placeholder="Nickname (Chinese isn't supported)" required>
    <button id="submit">Submit</button>
</div>

<div id="leaderboard" style="display:none;">
    <h2>~ Falling Ball Leaderboard! ~</h2>
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
const apiUrl = 'https://fallingball.onrender.com'; 
let user;
let name;
let loggedInUser = false;  // 新增變數來標記用戶是否已登錄

async function wakeUpServer() {
    try {
        fetch('/islogin')
            .then(response => response.text())
            .then(data => {
                if (data == '1') {
                    document.getElementById('loading').innerHTML = "Already Signed in";
                    loggedInUser = true;  // 更新登錄狀態
                    return;
                }
            });
    } catch (error) {
        console.error('Error:', error);
    }

    try {
        const response = await fetch(apiUrl+'/wakeup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.text();
        if (data == '"hello"' && !loggedInUser) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('input-form').style.display = 'flex';
        } else {
            console.error('Unexpected response:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

document.getElementById('submit').onclick = async () => {
    user = document.getElementById('user').value;
    name = document.getElementById('name').value;

    if (user && name) {
        // 立即同步更新用戶資料，發送至後端
        const response = await fetch(apiUrl+'/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, name })
        });

        if (!response.ok) {
            alert('Error: ' + await response.text());
            return;
        }

        // 記錄當前用戶的登錄狀態
        loggedInUser = user;

        document.getElementById('input-form').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'block';

        // 更新排行榜
        updateLeaderboard();
        setInterval(updateLeaderboard, 10000);
    } else {
        alert('Please enter your real name and nickname!')
    }
};

async function updateLeaderboard() {
    // 確保已經登錄且用戶資料已加載完成
    if (!loggedInUser) {
        alert("Please sign in first!");
        return;
    }

    const response = await fetch(apiUrl+'/leaderboard'); 
    const data = await response.json();

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; // Clear previous data

    data.sort((a, b) => b.score - a.score); // Sort by score descending

    let num = 1;
    data.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + num + '</td><td>' + user.name + '</td><td>' + user.score + '</td>';
        num += 1;

        if (user.name === name) {
            row.classList.add('highlight'); // Highlight user's row
        }

        tbody.appendChild(row);
    });
}

// 模擬分數更新
async function update(score) {
    // 確保已經登錄且用戶資料已加載完成
    if (!loggedInUser) {
        alert("Please sign in first!");
        return;
    }

    const response = await fetch(apiUrl+'/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, score })
    });
    if (!response.ok) {
        console.error('update failed!');
    }
}

window.onload = wakeUpServer;

</script>
</body>
</html>
`;

// 前端路由
app.get('/', (req, res) => {
  res.send(htmlpage); // 將 htmlpage 的內容作為響應返回
});

// 讓後端起床，根目錄請求處理
app.post('/wakeup', async (req, res) => {
  try {
    res.status(200).json('hello');
  } catch (err) {
    console.error('Error waking up server:', err);
    res.status(500).send('Server error');
  }
});

// 判斷是否已經登錄
app.get('/islogin', (req, res) => {
  if (loggedInUser) { // 檢查是否有已登錄的用戶
    res.status(200).send('1');  // 1 表示已登錄
  } else {
    res.status(200).send('0');  // 0 表示未登錄
  }
});

// 用戶註冊或加載資料的路由
app.post('/load', (req, res) => {
    const { user, name } = req.body;

    if (!user || !name) {
        return res.status(400).send('User and name are required');
    }

    if (!users[user]) {
        // 如果用戶不存在，創建新用戶
        users[user] = { name, score: 0 };
        return res.status(200).json({ score: 0 });  // 新用戶，返回默認分數 0
    }

    // 如果用戶已經存在，檢查名字是否匹配
    if (users[user].name !== name) {
        return res.status(400).send('Nickname doesn\'t match!');
    }

    // 返回現有用戶的分數
    res.status(200).json({ score: users[user].score });
});

// 更新分數
app.post('/update-score', (req, res) => {
  const { user, score } = req.body;

  if (!user || score === undefined) {
    return res.status(400).send('User and score are required');
  }

  if (users[user]) {
    users[user].score = score;
    res.status(200).send('Score updated');
  } else {
    res.status(404).send('User not found');
  }
});

// 查詢某個用戶的分數
app.get('/myscore', (req, res) => {
  const { user } = req.query;
  if (!user) {
    return res.status(400).send('User is required');
  }

  const userData = users[user];
  if (!userData) {
    return res.status(404).send('User not found');
  }

  res.status(200).send(userData.score.toString());
});

// 返回排行榜資料，按照 score 排序
app.get('/leaderboard', (req, res) => {
  const leaderboard = Object.values(users)
    .filter(user => user.name) // 確保用戶有有效的資料
    .sort((a, b) => b.score - a.score);
  res.status(200).json(leaderboard);
});

// 設定伺服器監聽埠
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
