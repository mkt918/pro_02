// ===== メインアプリケーションロジック =====

let workspace = null;

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    initBlockly();
    initTurtleSimulator();
    initEventListeners();
    updateCodePreview();
});

// Blocklyワークスペースの初期化
function initBlockly() {
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        scrollbars: true,
        trashcan: true,
        zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },
        grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
        }
    });

    // ワークスペース初期化時にはデフォルトを表示
    const codePreview = document.getElementById('codePreview');
    codePreview.textContent = `# ブロックを組み立ててから
# RUNボタンを押してね！

import turtle
t = turtle.Turtle()`;
}

// イベントリスナーの初期化
function initEventListeners() {
    document.getElementById('runBtn').addEventListener('click', runProgram);
    document.getElementById('resetBtn').addEventListener('click', resetProgram);
}

// コードプレビューの更新
function updateCodePreview(code) {
    try {
        // コードプレビューに表示
        const codePreview = document.getElementById('codePreview');
        codePreview.textContent = code;

        // シンタックスハイライトを適用
        Prism.highlightElement(codePreview);

    } catch (error) {
        console.error('コードプレビュー更新エラー:', error);
    }
}

// プログラム実行
async function runProgram() {
    try {
        // 実行中は無効化
        const runBtn = document.getElementById('runBtn');
        runBtn.disabled = true;
        runBtn.textContent = '⏳ ...';

        // 1. RUNを押したタイミングでコードを生成
        if (!Blockly.Python) {
            showConsoleMessage('エラー: Pythonジェネレーターが読み込まれていません', 'error');
            return;
        }

        let code = '';
        try {
            code = Blockly.Python.workspaceToCode(workspace);
        } catch (genError) {
            console.error('コード生成中のエラー:', genError);
            showConsoleMessage('コード生成に失敗したのだ...🧩: ' + genError.message, 'error');
            return;
        }

        if (!code.trim() || code.length < 10) { // startブロックだけだと短い
            showConsoleMessage('ブロックを正しく組み立ててね！🧩', 'error');
            return;
        }

        // 2. コードプレビューを更新
        updateCodePreview(code);

        showConsoleMessage('プログラムを実行中... 🏃', 'info');

        // 3. タートルシミュレーター実行
        await executeTurtleCommands(code);

    } catch (error) {
        showConsoleMessage(`エラー: ${error.message}`, 'error');
    } finally {
        // ボタンを再有効化
        const runBtn = document.getElementById('runBtn');
        runBtn.disabled = false;
        runBtn.textContent = '▶ RUN';
    }
}

// プログラムリセット
function resetProgram() {
    // タートルシミュレーターをリセット
    if (turtleSim) {
        turtleSim.reset();
    }

    // コンソールメッセージをリセット
    showConsoleMessage('リセット完了！新しいプログラムを作ろう 🎨', 'success');
}

// キーボードショートカット
document.addEventListener('keydown', function (e) {
    // Ctrl+Enter または Cmd+Enter で実行
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runProgram();
    }

    // Ctrl+R または Cmd+R でリセット（ブラウザのリロードを防ぐ）
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        resetProgram();
    }
});

// ウィンドウリサイズ時の処理
window.addEventListener('resize', function () {
    if (workspace) {
        Blockly.svgResize(workspace);
    }
});
