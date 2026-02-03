// ===== メインアプリケーションロジック v2.1 =====

let programBlocks = [];
let sortable = null;

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    initDragAndDrop();
    initSortable();
    initEventListeners();
    initTurtleSimulator();
});

// 並び替え機能の初期化
function initSortable() {
    const programArea = document.getElementById('programArea');
    sortable = new Sortable(programArea, {
        animation: 150,
        ghostClass: 'dragging',
        handle: '.block-content', // ブロックの内容部分を掴んで移動
        onEnd: function () {
            updateProgramBlocks();
            // 並び替え後にプレビューを更新したければここで
            const code = generatePythonCode();
            if (code) {
                const codePreview = document.getElementById('codePreview');
                codePreview.textContent = code;
                Prism.highlightElement(codePreview);
            }
        }
    });
}

// ドラッグ＆ドロップの初期化（パレットからプログラムエリアへ）
function initDragAndDrop() {
    const templates = document.querySelectorAll('.block-template');
    const programArea = document.getElementById('programArea');

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
            const dataString = e.dataTransfer.getData('text/plain');
            if (!dataString) return;
            const data = JSON.parse(dataString);
            if (data.type) addBlockToProgram(data);
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

    // 入力パラメータの初期値取得
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data.html;
    const selects = tempDiv.querySelectorAll('select');
    const params = {};
    selects.forEach(sel => {
        params[sel.dataset.param] = sel.value;
    });
    block.dataset.params = JSON.stringify(params);

    // ブロックの内容を設定
    const contentSpan = document.createElement('span');
    contentSpan.className = 'block-content';

    // セレクトボックスを含むHTMLを動的に生成
    let innerHTML = data.html;
    contentSpan.innerHTML = innerHTML;

    // プログラムエリア内のセレクトボックスに初期値をセットし、変更監視
    const programSelects = contentSpan.querySelectorAll('select');
    programSelects.forEach(sel => {
        const paramName = sel.dataset.param;
        sel.value = params[paramName];
        sel.addEventListener('change', function () {
            const currentParams = JSON.parse(block.dataset.params);
            currentParams[paramName] = this.value;
            block.dataset.params = JSON.stringify(currentParams);
            updatePreviewIfPossible();
        });
    });

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = function (e) {
        e.stopPropagation();
        block.remove();
        updateProgramBlocks();
        if (programArea.children.length === 0) {
            programArea.innerHTML = '<p class="drop-hint">← ブロックをドラッグして並べてね！<br>入れた後は上下に入れ替えられるのだ！</p>';
        }
        updatePreviewIfPossible();
    };

    block.appendChild(contentSpan);
    block.appendChild(deleteBtn);
    programArea.appendChild(block);

    updateProgramBlocks();
    updatePreviewIfPossible();
}

// プレビューの自動更新
function updatePreviewIfPossible() {
    updateProgramBlocks();
    const code = generatePythonCode();
    if (code) {
        const codePreview = document.getElementById('codePreview');
        codePreview.textContent = code;
        Prism.highlightElement(codePreview);
    }
}

// プログラムブロックの配列を最新化
function updateProgramBlocks() {
    const programArea = document.getElementById('programArea');
    const blocks = programArea.querySelectorAll('.program-block');
    programBlocks = Array.from(blocks).map(block => ({
        type: block.dataset.type,
        code: block.dataset.code,
        params: JSON.parse(block.dataset.params || '{}'),
        element: block
    }));

    // インデントの視覚的表現（ループ内）
    let depth = 0;
    programBlocks.forEach(b => {
        b.element.classList.remove('indented');
        if (b.type === 'loop_end') depth = Math.max(0, depth - 1);
        if (depth > 0) b.element.classList.add('indented');
        if (b.type === 'loop_start') depth++;
    });
}

// イベントリスナー
function initEventListeners() {
    document.getElementById('runBtn').addEventListener('click', runProgram);
    document.getElementById('resetBtn').addEventListener('click', resetProgram);
}

// Pythonコード生成ロジック
function generatePythonCode() {
    if (programBlocks.length === 0) return null;

    let code = '';
    let indentLevel = 0;
    const indent = '    ';

    for (const block of programBlocks) {
        let line = block.code;

        // パラメータ置換
        for (const [key, value] of Object.entries(block.params)) {
            line = line.replace('{' + key + '}', value);
        }

        if (block.type === 'loop_end') {
            indentLevel = Math.max(0, indentLevel - 1);
            code += indent.repeat(indentLevel) + '# ループここまで\n';
            continue;
        }

        code += indent.repeat(indentLevel) + line + '\n';

        if (block.type === 'loop_start') {
            indentLevel++;
        }
    }

    return code;
}

// 実行
async function runProgram() {
    const runBtn = document.getElementById('runBtn');
    try {
        runBtn.disabled = true;
        runBtn.textContent = '⏳...';

        updateProgramBlocks();
        if (programBlocks.length === 0) {
            showConsoleMessage('ブロックを置いてからRUNなのだ！🧩', 'error');
            return;
        }

        const hasStart = programBlocks.some(b => b.type === 'start');
        if (!hasStart) {
            showConsoleMessage('「🚀 プログラム開始」ブロックを最初に置いてね！', 'error');
            return;
        }

        const code = generatePythonCode();
        showConsoleMessage('プログラムを実行中... 🏃', 'info');
        await executeTurtleCommands(code);

    } catch (error) {
        showConsoleMessage('エラー: ' + error.message, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.textContent = '▶ RUN';
    }
}

// リセット
function resetProgram() {
    if (turtleSim) turtleSim.reset();
    showConsoleMessage('リセットしたのだ！✨', 'success');
}

// コンソール
function showConsoleMessage(message, type) {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = 'console-output ' + (type || '');
}
