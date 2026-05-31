const express = require('express');
const { stream } = require('undici');
const path = require('path');
const app = express();
const router = express.Router();

// 静的ファイル（ゲーム選択画面のHTMLなど）を「public」フォルダから配信
app.use(express.static(path.join(__dirname, 'public')));

// 専用の起動ルート：src/assets/games/viwer.html への直接アクセスを処理
app.get('/src/assets/games/viwer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'assets', 'games', 'viwer.html'));
});

// 専用の起動ルート：src/assets/games/games.html への直接アクセスを処理
app.get('/src/assets/games/games.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'assets', 'games', 'games.html'));
});

// ゲーム名とGitHubのパスのマッピング設定
const gamePaths = {
    'yohoho-io': 'yohoho-io',
    'poly-track': 'poly-track',
    'subway-surfers': 'hawaii', // スブウェイランのパス
    'table-tennis': 'table-tennis-world-tour' // 卓球のパス
};

// ゲームごとのリクエストを処理するルーティング
router.get('/:game/:file(*)?', async (req, res) => {
    const gameKey = req.params.game;
    
    // 登録されていないゲーム名、またはトップページのアクセスなら次に進む（静的HTMLを表示するため）
    if (!gamePaths[gameKey]) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    // リクエストされたファイル名を取得（空ならindex.html）
    const fileName = req.params.file || 'index.html';
    
    // 各ゲームに対応するGitHubのフォルダ名を取得
    const githubFolder = gamePaths[gameKey];
    
    // GitHubのRawデータURLを構築
    const targetUrl = `https://raw.githubusercontent.com/Gr4ys0n/Gr4ys0n.github.io/main/public/assets/games/${githubFolder}/${fileName}`;

    try {
        await stream(targetUrl, {
            method: 'GET',
            maxRedirections: 3,
        }, ({ statusCode, headers }) => {
            // 200 OK 以外は404エラーとして返す
            if (statusCode !== 200) {
                res.status(statusCode).send('Resource not found');
                return;
            }

            let contentType = headers['content-type'];
            if (fileName === 'index.html' || fileName.endsWith('index.html')) {
                contentType = 'text/html';
            } else if (fileName.endsWith('.js')) {
                contentType = 'application/javascript';
            } else if (fileName.endsWith('.wasm')) {
                contentType = 'application/wasm';
            } else if (fileName.endsWith('.css')) {
                contentType = 'text/css';
            }

            // ヘッダーの設定
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
            res.setHeader('Cache-Control', `public, max-age=31536000, immutable`);
            
            return res;
        });
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});

app.use('/', router);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
