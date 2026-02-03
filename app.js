// ===== メインアプリケーションロジック =====

let programBlocks = [];

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    initDragAndDrop();
    initEventListeners();
    initTurtleSimulator();
});

// ドラッグ＆ドロップの初期化
function initDragAndDrop() {
    const templates = document.querySelectorAll('.block-template');
    const programArea = document.getElementById('programArea');

    // テンプレートブロックにドラッグイベントを設定
    templates.forEach(template => {
        template.setAttribute('draggable', 'true');

        template.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: this.dataset.type,
                code: this.dataset.code,
                html: this.innerHTML
            }));
            this.classList.add('dragging');
        });

        template.addEventListener('dragend', function () {
            this.classList.remove('dragging');
        });
    });

    // プログラムエリアにドロップイベントを設定
    programArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });

    programArea.addEventListener('dragleave', function () {
        this.classList.remove('drag-over');
    });

    programArea.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            addBlockToProgram(data);
        } catch (err) {
            console.error('ドロップエラー:', err);
        }
    });
}

// プログラムにブロックを追加
function addBlockToProgram(data) {
    const programArea = document.getElementById('programArea');

    // ヒントテキストを削除
    const hint = programArea.querySelector('.drop-hint');
    if (hint) hint.remove();

    // ブロック要素を作成
    const block = document.createElement('div');
    block.className = 'program-block';
    block.dataset.type = data.type;
    block.dataset.code = data.code;

    // セレクトボックスを含むHTMLを解析
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.html;

    // セレクトの値を取得
    const selects = tempDiv.querySelectorAll('select');
    const params = {};
    selects.forEach(sel => {
        params[sel.dataset.param] = sel.value;
    });
    block.dataset.params = JSON.stringify(params);

    // ブロックの内容を設定
    const contentSpan = document.createElement('span');
    contentSpan.className = 'block-content';

    // テキスト部分を生成
    let displayText = data.html.replace(/<select[^>]*>[\s\S]*?<\/select>/gi, function (match) {
        const temp = document.createElement('div');
        temp.innerHTML = match;
        const sel = temp.querySelector('select');
        const param = sel.dataset.param;

        // セレクトボックスを作成
        const newSelect = document.createElement('select');
        newSelect.className = 'block-select';
        newSelect.dataset.param = param;
        newSelect.innerHTML = sel.innerHTML;
        newSelect.value = params[param];

        return newSelect.outerHTML;
    });
    contentSpan.innerHTML = displayText;

    // 削除ボタンを追加
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = function () {
        block.remove();
        updateProgramBlocks();
        // ブロックがなくなったらヒントを表示
        if (programArea.children.length === 0) {
            programArea.innerHTML = '<p class="drop-hint">← ブロックをここにドラッグ＆ドロップ！</p>';
        }
    };

    block.appendChild(contentSpan);
    block.appendChild(deleteBtn);

    // セレクト変更時にパラメータを更新
    block.querySelectorAll('.block-select').forEach(sel => {
        sel.addEventListener('change', function () {
            const params = JSON.parse(block.dataset.params);
            params[this.dataset.param] = this.value;
            block.dataset.params = JSON.stringify(params);
        });
    });

    programArea.appendChild(block);
    updateProgramBlocks();
}

// プログラムブロックの配列を更新
function updateProgramBlocks() {
    const programArea = document.getElementById('programArea');
    const blocks = programArea.querySelectorAll('.program-block');
    programBlocks = Array.from(blocks).map(block => ({
        type: block.dataset.type,
        code: block.dataset.code,
        params: JSON.parse(block.dataset.params || '{}')
    }));
}

// イベントリスナーの初期化
function initEventListeners() {
    document.getElementById('runBtn').addEventListener('click', runProgram);
    document.getElementById('resetBtn').addEventListener('click', resetProgram);
}

// Pythonコードを生成
function generatePythonCode() {
    if (programBlocks.length === 0) {
        return null;
    }

    let code = '';
    let indentLevel = 0;
    const indent = '    ';

    for (const block of programBlocks) {
        let line = block.code;

        // パラメータを置換
        for (const [key, value] of Object.entries(block.params)) {
            line = line.replace('{' + key + '}', value);
        }

        // ループ終わりの処理
        if (block.type === 'loop_end') {
            indentLevel = Math.max(0, indentLevel - 1);
            continue; // ループ終わりはコードとして出力しない
        }

        // インデントを追加
        code += indent.repeat(indentLevel) + line + '\n';

        // ループ開始の場合、次からインデント
        if (block.type === 'loop_start') {
            indentLevel++;
        }
    }

    return code;
}

// プログラム実行
async function runProgram() {
    const runBtn = document.getElementById('runBtn');

    try {
        runBtn.disabled = true;
        runBtn.textContent = '⏳...';

        updateProgramBlocks();

        if (programBlocks.length === 0) {
            showConsoleMessage('ブロックを配置してからRUNを押してね！🧩', 'error');
            return;
        }

        // startブロックがあるかチェック
        const hasStart = programBlocks.some(b => b.type === 'start');
        if (!hasStart) {
            showConsoleMessage('「🚀 プログラム開始」ブロックを最初に置いてね！', 'error');
            return;
        }

        // Pythonコードを生成
        const code = generatePythonCode();

        if (!code) {
            showConsoleMessage('コードを生成できなかったのだ...', 'error');
            return;
        }

        // コードプレビューを更新
        const codePreview = document.getElementById('codePreview');
        codePreview.textContent = code;
        Prism.highlightElement(codePreview);

        showConsoleMessage('プログラムを実行中... 🏃', 'info');

        // タートルシミュレーターで実行
        await executeTurtleCommands(code);

    } catch (error) {
        showConsoleMessage('エラー: ' + error.message, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ RUN';
    }
}

// プログラムリセット
function resetProgram() {
    if (turtleSim) {
        turtleSim.reset();
    }
    showConsoleMessage('リセット完了！新しいプログラムを作ろう 🎨', 'success');
}

// コンソールメッセージ表示
function showConsoleMessage(message, type) {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = 'console-output ' + (type || '');
}
