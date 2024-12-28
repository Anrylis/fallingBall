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
    <h2>~Falling Ball Leaderboard~</h2>
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
    try{
        fetch('/islogin')
            .then(response => response.text())
            .then(data => {
                if(data == '1'){
                    document.getElementById('loading').innerHTML = "Already Signed in";
                    run = false;
                    return;
                }
            });
    } catch (error) {
        console.error('Error:', error);
    }

    try {
        const response = await fetch(apiUrl + '/wakeup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.text();
        if (data == '"hello"' && run) {
            // 如果回應是 "hello"，隱藏 loading 畫面並顯示內容
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
        // Load user data
        const response = await fetch(apiUrl + '/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user, name })
        });
        const data = await response.json();

        if (response.ok) {
            fetch('/load-score', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'score=' + data['score']
            });

            // Hide input form and show leaderboard
            document.getElementById('input-form').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'block';
            updateLeaderboard();
            setInterval(updateLeaderboard, 10000); // Update every 10 seconds
        } else {
            alert('Nickname isn\'t correct!');
        }
    }else{
        alert('Please enter your real name and nickname!')
    }
};

async function update(score) {
    const response = await fetch(apiUrl + '/update-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, score })
    });
    if (!response.ok) {
        if(response.status == 402)
            alert("NO CHEATING");
        console.error('update failed!');
    }
}

async function updateLeaderboard() {
    const response = await fetch(apiUrl + '/leaderboard');
    const data = await response.json();

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; // Clear previous data

    data.sort(function(a, b) { return b.score - a.score }); // Sort by score descending

    fetch('/myscore')
        .then(response => response.text())
        .then(function(data) {
            update(data);
        });

    let num = 1;
    data.forEach(function(user) {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + num + '</td><td>' + user.name + '</td><td>' + user.score + '</td>';
        num += 1;

        if (user.name === name) {
            row.classList.add('highlight'); // Highlight ur row
        }

        tbody.appendChild(row);
    });
}

window.onload = wakeUpServer;
</script>

</body>
</html>
`;

// 首頁顯示
app.get('/', (req, res) => {
    res.send(htmlPage);  // 返回存儲在 htmlPage 變數中的 HTML
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
    console.log('Server is running on port ' + PORT);
});
