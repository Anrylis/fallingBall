const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// 使用 bodyParser 來解析 POST 請求中的 JSON 資料，使用 cors 中間件
app.use(cors());
app.use(bodyParser.json());

let users = {}; // 用戶資料將以 { username: { name, score } } 形式儲存

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
    <input type="text" id="name" placeholder="Nickname (Chinese isn't support)" required>
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
let run = true;

async function wakeUpServer() {
    try {
        fetch('/islogin')
            .then(response => response.text())
            .then(data => {
                if (data == '1') {
                    document.getElementById('loading').innerHTML = "Already Signed in";
                    run = false;
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
        if (data == '"hello"' && run) {
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
        // 模擬資料庫操作，檢查用戶是否已經註冊
        if (users[user]) {
            if (users[user].name !== name) {
                alert('Nickname does not match!');
                return;
            }
        } else {
            users[user] = { name, score: 0 };
        }

        document.getElementById('input-form').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'block';
        updateLeaderboard();
        setInterval(updateLeaderboard, 10000);
    } else {
        alert('Please enter your real name and nickname!')
    }
};

async function updateLeaderboard() {
    const leaderboard = Object.values(users).sort((a, b) => b.score - a.score);

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    leaderboard.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + num + '</td><td>' + user.name + '</td><td>' + user.score + '</td>';
        if (user.name === name) {
            row.classList.add('highlight');
        }
        tbody.appendChild(row);
    });
}

// 模擬分數更新
async function updateScore(user, score) {
    if (users[user]) {
        users[user].score = score;
        updateLeaderboard();
    } else {
        console.error('User not found!');
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

// 返回排行榜資料，按照 score 排序
app.get('/leaderboard', (req, res) => {
  const leaderboard = Object.values(users).sort((a, b) => b.score - a.score);
  res.status(200).json(leaderboard);
});

// 設定伺服器監聽埠
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
