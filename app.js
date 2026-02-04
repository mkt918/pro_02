// ===== メインアプリケーションロジック v2.3 (2026-02-04-1204) =====

let programBlocks = [];
let sortableProgram = null;
let sortablePalette = null;

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    initUnifiedSortable();
    initEventListeners();
    initTurtleSimulator();
    syncGlobalSpeed();
    addInitialBlock(); // 初期ブロックの配置
});

// 初期ブロック（プログラム開始）を配置する
function addInitialBlock() {
    const programArea = document.getElementById('programArea');
    if (programArea.querySelectorAll('.program-block').length === 0) {
        addBlockProgrammatically('start');
        updatePreviewIfPossible();
    }
}

// SortableJS を使った統合ドラッグ＆ドロップの初期化
function initUnifiedSortable() {
    const palette = document.getElementById('palette');
    const programArea = document.getElementById('programArea');

    // パレット内のブロックをクリックでも追加できるようにする（イベント委譲）
    palette.addEventListener('click', function (e) {
        const target = e.target.closest('.block-template');
        // パレット内にあるテンプレートブロックのみを対象とする
        if (target && target.parentElement === palette) {
            const clone = target.cloneNode(true);
            programArea.appendChild(clone);
            setupNewBlock(clone);
            updatePreviewIfPossible();
        }
    });

    // パレット側：ここからプログラムエリアへクローン（複製）できるようにする
    sortablePalette = new Sortable(palette, {
        group: {
            name: 'blocks',
            pull: 'clone',
            put: false
        },
        sort: false,
        draggable: '.block-template',
        animation: 150
    });

    // プログラムエリア側：受け入れと並び替えの両方を担当
    sortableProgram = new Sortable(programArea, {
        group: {
            name: 'blocks',
            put: true
        },
        animation: 150,
        ghostClass: 'dragging',
        draggable: '.block-template, .program-block',
        onAdd: function (evt) {
            const itemEl = evt.item;
            setupNewBlock(itemEl);
            updatePreviewIfPossible();
        },
        onEnd: function () {
            updatePreviewIfPossible();
        }
    });
}

// 新しく追加されたブロックのセットアップ
function setupNewBlock(el) {
    const type = el.dataset.type;

    // テンプレート展開の場合
    if (type === 'template') {
        const algorithm = JSON.parse(el.dataset.algorithm || '[]');
        el.remove(); // テンプレートブロック自身は消す
        algorithm.forEach(step => {
            addBlockProgrammatically(step.type, step.val);
        });
        checkEmptyHint();
        return;
    }

    el.classList.remove('block-template');
    el.classList.add('program-block');
    // ...
    // 入力パラメータの初期値取得
    const selects = el.querySelectorAll('select');
    const params = {};
    selects.forEach(sel => {
        params[sel.dataset.param] = sel.value;
    });
    el.dataset.params = JSON.stringify(params);

    // ブロックの内容コンテナを構築
    const content = el.innerHTML;
    el.innerHTML = '';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'block-content';
    contentSpan.innerHTML = content;

    // 削除ボタン
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = function (e) {
        e.stopPropagation();
        el.remove();
        checkEmptyHint();
        updatePreviewIfPossible();
    };

    el.appendChild(contentSpan);
    el.appendChild(deleteBtn);

    // セレクトボックスのイベント監視
    const programSelects = el.querySelectorAll('select');
    programSelects.forEach(sel => {
        const paramName = sel.dataset.param;
        if (params[paramName]) sel.value = params[paramName];

        sel.addEventListener('change', function () {
            const currentParams = JSON.parse(el.dataset.params);
            currentParams[paramName] = this.value;
            el.dataset.params = JSON.stringify(currentParams);
            updatePreviewIfPossible();
        });
    });

    const hint = document.querySelector('.drop-hint');
    if (hint) hint.remove();
}

// 指定したタイプと値でブロックをプログラム的に追加する
function addBlockProgrammatically(type, values) {
    // パレットから対応するテンプレートを探す
    const palette = document.getElementById('palette');
    const sourceTemplate = palette.querySelector(`.block-template[data-type="${type}"]`);
    if (!sourceTemplate) return;

    const clone = sourceTemplate.cloneNode(true);
    const programArea = document.getElementById('programArea');
    programArea.appendChild(clone);

    // 値をセット
    if (values) {
        const selects = clone.querySelectorAll('select');
        selects.forEach(sel => {
            const param = sel.dataset.param;
            if (values[param]) sel.value = values[param];
        });
    }

    setupNewBlock(clone);
}

// プログラムが空かチェックしてヒントを出す
function checkEmptyHint() {
    const programArea = document.getElementById('programArea');
    if (programArea.querySelectorAll('.program-block').length === 0) {
        programArea.innerHTML = '<p class="drop-hint">← ブロックをドラッグして並べてね！<br>入れた後は上下に入れ替えられるのだ！</p>';
    }
}

// プレビューの自動更新
function updatePreviewIfPossible() {
    updateProgramBlocks();
    const code = generatePythonCode();
    const codePreview = document.getElementById('codePreview');
    if (code) {
        codePreview.textContent = code;
        Prism.highlightElement(codePreview);
    } else {
        codePreview.textContent = '# RUNボタンを押すと生成されるのだ！';
    }
}

// 速度スライダーとの同期
function syncGlobalSpeed() {
    const speedSlider = document.getElementById('globalSpeed');
    if (speedSlider) {
        speedSlider.addEventListener('input', function () {
            if (turtleSim) {
                turtleSim.setSpeed(parseInt(this.value));
            }
        });
        // 初期値反映
        if (turtleSim) turtleSim.setSpeed(parseInt(speedSlider.value));
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
        b.element.classList.remove('indented-1', 'indented-2', 'indented-3');
        if (b.type === 'loop_end') depth = Math.max(0, depth - 1);
        if (depth > 0) {
            const indentClass = 'indented-' + Math.min(depth, 3);
            b.element.classList.add(indentClass);
        }
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

        // マルチライン対応：各行にインデントを適用
        const blockLines = line.split('\n');
        for (const bl of blockLines) {
            code += indent.repeat(indentLevel) + bl + '\n';
        }

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
    showConsoleMessage('リセット完了！✨', 'success');
}

// コンソール表示
function showConsoleMessage(message, type) {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = 'console-output ' + (type || '');
}
