// ===== メインアプリケーションロジック v2.3 (2026-02-04-1204) =====

let programBlocks = [];
let sortableProgram = null;
let sortablePalette = null;

// ファミコン52パレット (Peconet参照)
const FAMICOM_COLORS = [
    "#7c7c7c", "#0000fc", "#0000bc", "#4428bc", "#940084", "#a80020", "#a81000", "#881400", "#503000", "#007800", "#006800", "#0058f8", "#004058",
    "#bcbcbc", "#0078f8", "#0058f8", "#6844fc", "#d800cc", "#e40058", "#f83800", "#e45c10", "#ac7c00", "#00b800", "#00a844", "#008888", "#000000",
    "#f8f8f8", "#3cbcfc", "#6888fc", "#9878f8", "#f878f8", "#f85898", "#f87858", "#fca044", "#f8b800", "#b8f818", "#58d854", "#58f898", "#00e8d8", "#787878",
    "#fcfcfc", "#a4e4fc", "#b8b8f8", "#d8b8f8", "#f8b8f8", "#f8a4c0", "#f0d0b0", "#fce0a8", "#f8d878", "#d8f878", "#b8f8b8", "#b8f8b8", "#00fcfc", "#f8d8f8"
];

// 初期化
document.addEventListener('DOMContentLoaded', function () {
    initUnifiedSortable();
    initEventListeners();
    initTurtleSimulator();
    initGridModeListeners();
    initProgramTabs();
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
    const freePalette = document.getElementById('freePalette');
    const gridPalette = document.getElementById('gridPalette');
    const programArea = document.getElementById('programArea');

    // 両方のパレットに対してセットアップ
    [freePalette, gridPalette].forEach(palette => {
        if (!palette) return;

        // 既存のSortableを破棄
        if (palette._sortable) {
            palette._sortable.destroy();
        }

        // パレット内のブロックをクリックでも追加できるようにする
        palette.onclick = function (e) {
            // selectやinputをクリックした場合は、リストの変更を優先させるため追加しない
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
                return;
            }

            const target = e.target.closest('.block-template');
            if (target && palette.contains(target)) {
                const clone = target.cloneNode(true);
                programArea.appendChild(clone);
                setupNewBlock(clone);
                updatePreviewIfPossible();
            }
        };

        // パレット側：ここからプログラムエリアへクローン（複製）できるようにする
        palette._sortable = new Sortable(palette, {
            group: {
                name: 'blocks',
                pull: 'clone',
                put: false
            },
            sort: false,
            draggable: '.block-template',
            animation: 150
        });
    });

    // プログラムエリア側：受け入れと並び替えの両方を担当
    if (sortableProgram) {
        sortableProgram.destroy();
    }
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
    const params = {};
    const controls = el.querySelectorAll('select, input');
    controls.forEach(control => {
        params[control.dataset.param] = control.value;
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

    // フォーム要素のイベント監視
    const programControls = el.querySelectorAll('select, input');
    programControls.forEach(control => {
        const paramName = control.dataset.param;
        if (params[paramName]) control.value = params[paramName];

        const eventType = control.tagName === 'SELECT' ? 'change' : 'input';
        control.addEventListener(eventType, function () {
            const currentParams = JSON.parse(el.dataset.params);
            currentParams[paramName] = this.value;
            el.dataset.params = JSON.stringify(currentParams);
            updatePreviewIfPossible();
        });
    });

    // カラーパレットの生成 (colorブロックのみ)
    if (type === 'color') {
        const grid = el.querySelector('.color-palette-grid');
        const colorInput = el.querySelector('input[type="color"]');
        const mainRow = el.querySelector('.block-main-row');

        if (mainRow && grid) {
            mainRow.onclick = function (e) {
                // input[type="color"] 自体がクリックされた場合はトグルしない
                if (e.target.tagName === 'INPUT') return;

                e.stopPropagation();
                grid.classList.toggle('show');
            };
        }

        if (grid && colorInput) {
            FAMICOM_COLORS.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch';
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.onclick = function (e) {
                    e.stopPropagation();
                    colorInput.value = color;
                    // パラメータ更新
                    const currentParams = JSON.parse(el.dataset.params);
                    currentParams['color'] = color;
                    el.dataset.params = JSON.stringify(currentParams);
                    updatePreviewIfPossible();
                };
                grid.appendChild(swatch);
            });
        }
    }

    const hint = document.querySelector('.drop-hint');
    if (hint) hint.remove();
}

// 指定したタイプと値でブロックをプログラム的に追加する
function addBlockProgrammatically(type, values) {
    // 現在表示されているパレット、または両方のパレットからテンプレートを探す
    const freePalette = document.getElementById('freePalette');
    const gridPalette = document.getElementById('gridPalette');
    let sourceTemplate = null;

    if (freePalette && freePalette.style.display !== 'none') {
        sourceTemplate = freePalette.querySelector(`.block-template[data-type="${type}"]`);
    }
    if (!sourceTemplate && gridPalette && gridPalette.style.display !== 'none') {
        sourceTemplate = gridPalette.querySelector(`.block-template[data-type="${type}"]`);
    }
    // もし表示中のパレットに見つからなければ、どちらかにある方を使う
    if (!sourceTemplate) {
        sourceTemplate = document.querySelector(`.palette .block-template[data-type="${type}"]`);
    }

    if (!sourceTemplate) return;

    const clone = sourceTemplate.cloneNode(true);
    const programArea = document.getElementById('programArea');
    programArea.appendChild(clone);

    // 値をセット
    if (values) {
        const controls = clone.querySelectorAll('select, input');
        controls.forEach(control => {
            const param = control.dataset.param;
            if (values[param]) control.value = values[param];
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

    // プログラムエリアをクリアして初期ブロックを再配置
    const programArea = document.getElementById('programArea');
    programArea.innerHTML = '';
    addInitialBlock();
    updatePreviewIfPossible();

    showConsoleMessage('リセット完了！✨', 'success');
}

// グリッドモード切り替え
function initGridModeListeners() {
    const modeFreeBtn = document.getElementById('modeFreeBtn');
    const modeGridBtn = document.getElementById('modeGridBtn');
    const gridSizeControl = document.getElementById('gridSizeControl');
    const gridSizeSelect = document.getElementById('gridSize');
    const freePalette = document.getElementById('freePalette');
    const gridPalette = document.getElementById('gridPalette');

    function switchMode(enabled) {
        if (enabled) {
            modeGridBtn.classList.add('active');
            modeFreeBtn.classList.remove('active');
        } else {
            modeFreeBtn.classList.add('active');
            modeGridBtn.classList.remove('active');
        }

        gridSizeControl.style.display = enabled ? 'flex' : 'none';

        // パレットを切り替え
        if (enabled) {
            freePalette.style.display = 'none';
            gridPalette.style.display = 'block';
        } else {
            freePalette.style.display = 'block';
            gridPalette.style.display = 'none';
        }

        // ブロックの表示を切り替え（フリーハンドモードのみ）
        if (!enabled) {
            updateBlockLabelsForGridMode(false);
        }

        if (turtleSim) {
            const size = parseInt(gridSizeSelect.value);
            turtleSim.setGridMode(enabled, size);
        }

        // パレットのSortableを再初期化
        initUnifiedSortable();
    }

    if (modeFreeBtn) modeFreeBtn.addEventListener('click', () => switchMode(false));
    if (modeGridBtn) modeGridBtn.addEventListener('click', () => switchMode(true));

    gridSizeSelect.addEventListener('change', function () {
        if (turtleSim && modeGridBtn && modeGridBtn.classList.contains('active')) {
            turtleSim.setGridMode(true, parseInt(this.value));
        }
    });
}

// ブロックのラベルをグリッドモード用に更新（フリーハンドパレット用、現在は別パレットなので不要だが互換性のため残す）
function updateBlockLabelsForGridMode(isGridMode) {
    const palette = document.getElementById('freePalette');
    if (!palette) return;
    const blocks = palette.querySelectorAll('.block-template');

    blocks.forEach(block => {
        const type = block.dataset.type;

        if (type === 'forward' || type === 'backward') {
            const textNode = Array.from(block.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes('歩'));
            if (textNode) {
                if (isGridMode) {
                    textNode.textContent = textNode.textContent.replace('歩すすむ', 'マスすすむ').replace('歩さがる', 'マスさがる');
                } else {
                    textNode.textContent = textNode.textContent.replace('マスすすむ', '歩すすむ').replace('マスさがる', '歩さがる');
                }
            }
        }
    });
}

// プログラムタブの切り替え
function initProgramTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.dataset.tab;

            // すべてのタブボタンとコンテンツから active を削除
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // クリックされたタブをアクティブに
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + 'Tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // コードタブに切り替えた時はコードを更新
            if (targetTab === 'code') {
                updatePreviewIfPossible();
            }
        });
    });
}

// コンソール表示
function showConsoleMessage(message, type) {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = 'console-output ' + (type || '');
}
