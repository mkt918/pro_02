// ===== タートルシミュレーター =====

class TurtleSimulator {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // タートルの初期状態
        this.reset();
    }

    reset() {
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 背景を白に
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // タートルの状態を初期化
        this.x = this.width / 2;
        this.y = this.height / 2;
        this.angle = 0; // 0度 = 右向き
        this.penDown = true;
        this.color = 'black';
        this.speed = 5; // アニメーション速度（ミリ秒）
        this.isRunning = false;
        this.hasError = false;

        // タートルを描画
        this.drawTurtle();
    }

    drawTurtle() {
        const size = 15;
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        // キャンバス座標(Y下向き)では正の回転が時計回り
        this.ctx.rotate(this.angle * Math.PI / 180);

        // タートルの形（右向きの三角形）
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(size, 0); // 先端（右）
        this.ctx.lineTo(-size * 0.7, -size * 0.7); // 後端（左上）
        this.ctx.lineTo(-size * 0.7, size * 0.7); // 後端（左下）
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    clearTurtle() {
        // タートルの周囲をクリア（再描画のため）
        const size = 30; // 以前より少し大きく
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // 消した部分を白で塗り直す（背景が白の場合）
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.globalCompositeOperation = 'destination-over';
        this.ctx.fillRect(this.x - size, this.y - size, size * 2, size * 2);
        this.ctx.restore();
    }

    async forward(distance) {
        if (this.hasError) return;

        const radians = this.angle * Math.PI / 180;
        const newX = this.x + distance * Math.cos(radians);
        const newY = this.y + distance * Math.sin(radians);

        // 境界チェック
        if (!this.checkBoundary(newX, newY)) {
            this.hasError = true;
            throw new Error('画面の外には出られないのだ！🚫');
        }

        // アニメーション
        await this.animateMove(newX, newY);
    }

    async backward(distance) {
        await this.forward(-distance);
    }

    right(angle) {
        if (this.hasError) return;
        // キャンバス座標(Y下向き)では足すと時計回り(右)
        this.angle = (this.angle + angle) % 360;
    }

    left(angle) {
        if (this.hasError) return;
        // 引くと反時計回り(左)
        this.angle = (this.angle - angle + 360) % 360;
    }

    penup() {
        this.penDown = false;
    }

    pendown() {
        this.penDown = true;
    }

    setColor(color) {
        this.color = color;
    }

    checkBoundary(x, y) {
        const margin = 10;
        return x >= margin && x <= this.width - margin &&
            y >= margin && y <= this.height - margin;
    }

    async animateMove(targetX, targetY) {
        const steps = 20;
        const dx = (targetX - this.x) / steps;
        const dy = (targetY - this.y) / steps;

        for (let i = 0; i < steps; i++) {
            // 前のタートルを消去
            this.clearTurtle();

            // 線を描画（ペンが下りている場合）
            if (this.penDown) {
                this.ctx.strokeStyle = this.color;
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';

                this.ctx.beginPath();
                this.ctx.moveTo(this.x, this.y);
                this.x += dx;
                this.y += dy;
                this.ctx.lineTo(this.x, this.y);
                this.ctx.stroke();
            } else {
                this.x += dx;
                this.y += dy;
            }

            // 新しいタートルを描画
            this.drawTurtle();

            // アニメーション待機
            await this.sleep(this.speed);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// グローバルインスタンス
let turtleSim = null;

// 初期化
function initTurtleSimulator() {
    turtleSim = new TurtleSimulator('turtleCanvas');
}

// コマンド実行
async function executeTurtleCommands(code) {
    if (!turtleSim) {
        initTurtleSimulator();
    }

    turtleSim.reset();

    try {
        // Pythonコードを解析して実行
        await parsePythonCode(code);

        if (!turtleSim.hasError) {
            showConsoleMessage('実行完了！素晴らしいのだ！✨', 'success');
        }
    } catch (error) {
        showConsoleMessage(`Error: ${error.message}`, 'error');
    }
}

// Pythonコードのパース（簡易版）
async function parsePythonCode(code) {
    const lines = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#') && !line.trim().startsWith('import'));

    let indentLevel = 0;
    let loopCount = 0;
    let loopCommands = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const currentIndent = line.search(/\S/);

        // ループの開始
        if (trimmed.startsWith('for')) {
            const match = trimmed.match(/range\((\d+)\)/);
            if (match) {
                loopCount = parseInt(match[1]);
                indentLevel = currentIndent;
                loopCommands = [];
            }
            continue;
        }

        // ループ内のコマンド
        if (currentIndent > indentLevel && loopCount > 0) {
            loopCommands.push(trimmed);
            continue;
        }

        // ループの終了・実行
        if (loopCommands.length > 0 && currentIndent <= indentLevel) {
            for (let i = 0; i < loopCount; i++) {
                for (const cmd of loopCommands) {
                    await executeCommand(cmd);
                }
            }
            loopCommands = [];
            loopCount = 0;
            indentLevel = 0;
        }

        // 通常のコマンド実行
        if (currentIndent === 0 || loopCount === 0) {
            await executeCommand(trimmed);
        }
    }

    // 最後のループを実行
    if (loopCommands.length > 0) {
        for (let i = 0; i < loopCount; i++) {
            for (const cmd of loopCommands) {
                await executeCommand(cmd);
            }
        }
    }
}

// 個別コマンドの実行
async function executeCommand(cmd) {
    if (!cmd || cmd === 'pass') return;

    // forward
    if (cmd.includes('forward')) {
        const match = cmd.match(/forward\((\d+)\)/);
        if (match) await turtleSim.forward(parseInt(match[1]));
    }
    // backward
    else if (cmd.includes('backward')) {
        const match = cmd.match(/backward\((\d+)\)/);
        if (match) await turtleSim.backward(parseInt(match[1]));
    }
    // right
    else if (cmd.includes('right')) {
        const match = cmd.match(/right\((\d+)\)/);
        if (match) turtleSim.right(parseInt(match[1]));
    }
    // left
    else if (cmd.includes('left')) {
        const match = cmd.match(/left\((\d+)\)/);
        if (match) turtleSim.left(parseInt(match[1]));
    }
    // penup
    else if (cmd.includes('penup')) {
        turtleSim.penup();
    }
    // pendown
    else if (cmd.includes('pendown')) {
        turtleSim.pendown();
    }
    // color
    else if (cmd.includes('color')) {
        const match = cmd.match(/color\(['"](\w+)['"]\)/);
        if (match) turtleSim.setColor(match[1]);
    }
}

// コンソールメッセージ表示
function showConsoleMessage(message, type = 'info') {
    const consoleOutput = document.getElementById('consoleOutput');
    consoleOutput.textContent = message;
    consoleOutput.className = `console-output ${type}`;
}
