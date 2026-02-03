// ===== Blocklyカスタムブロック定義 =====

// Official Python generator is loaded in index.html as Blockly.Python
if (!Blockly.Python) {
  console.error('Blockly.Python is not loaded!');
}

// 優先順位の定義
if (!Blockly.Python.ORDER_ATOMIC) Blockly.Python.ORDER_ATOMIC = 0;
if (!Blockly.Python.ORDER_NONE) Blockly.Python.ORDER_NONE = 99;

// インデント処理
Blockly.Python.INDENT = '    ';

// scrub_ メソッドをオーバーライド
Blockly.Python.scrub_ = function (block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !opt_thisOnly) {
    return code + Blockly.Python.blockToCode(nextBlock);
  }
  return code;
};

// 最新のBlocklyでは forBlock に登録することが推奨される場合があるため、
// 両方のパターンに対応できるようにします。
const pythonGenerator = Blockly.Python;

// ===== 1. Startブロック =====
Blockly.Blocks['turtle_start'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🚀 プログラム開始");
    this.setNextStatement(true, null);
    this.setColour(76);
    this.setTooltip("プログラムの開始地点なのだ！");
    this.setHelpUrl("");
  }
};

pythonGenerator.forBlock['turtle_start'] = function (block) {
  return 'import turtle\nt = turtle.Turtle()\nt.speed(0)\n';
};

// ===== 2. Forward（前進）ブロック =====
Blockly.Blocks['turtle_forward'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("⬆️ 前に進む")
      .appendField(new Blockly.FieldDropdown([
        ["10", "10"],
        ["50", "50"],
        ["100", "100"],
        ["200", "200"]
      ]), "DISTANCE")
      .appendField("歩");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(33);
    this.setTooltip("タートルを前に進めるのだ！");
  }
};

pythonGenerator.forBlock['turtle_forward'] = function (block) {
  const distance = block.getFieldValue('DISTANCE');
  return 't.forward(' + distance + ')\n';
};

// ===== 3. Backward（後退）ブロック =====
Blockly.Blocks['turtle_backward'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("⬇️ 後ろに進む")
      .appendField(new Blockly.FieldDropdown([
        ["10", "10"],
        ["50", "50"],
        ["100", "100"],
        ["200", "200"]
      ]), "DISTANCE")
      .appendField("歩");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(33);
    this.setTooltip("タートルを後ろに進めるのだ！");
  }
};

pythonGenerator.forBlock['turtle_backward'] = function (block) {
  const distance = block.getFieldValue('DISTANCE');
  return 't.backward(' + distance + ')\n';
};

// ===== 4. Right（右回転）ブロック =====
Blockly.Blocks['turtle_right'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("↪️ 右に回る")
      .appendField(new Blockly.FieldDropdown([
        ["15°", "15"],
        ["30°", "30"],
        ["45°", "45"],
        ["90°", "90"],
        ["180°", "180"]
      ]), "ANGLE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(255);
    this.setTooltip("タートルを右に回転させるのだ！");
  }
};

pythonGenerator.forBlock['turtle_right'] = function (block) {
  const angle = block.getFieldValue('ANGLE');
  return 't.right(' + angle + ')\n';
};

// ===== 5. Left（左回転）ブロック =====
Blockly.Blocks['turtle_left'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("↩️ 左に回る")
      .appendField(new Blockly.FieldDropdown([
        ["15°", "15"],
        ["30°", "30"],
        ["45°", "45"],
        ["90°", "90"],
        ["180°", "180"]
      ]), "ANGLE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(255);
    this.setTooltip("タートルを左に回転させるのだ！");
  }
};

pythonGenerator.forBlock['turtle_left'] = function (block) {
  const angle = block.getFieldValue('ANGLE');
  return 't.left(' + angle + ')\n';
};

// ===== 6. Loop（ループ）ブロック =====
Blockly.Blocks['turtle_loop'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🔁 繰り返す")
      .appendField(new Blockly.FieldDropdown([
        ["2回", "2"],
        ["3回", "3"],
        ["4回", "4"],
        ["5回", "5"],
        ["6回", "6"],
        ["8回", "8"],
        ["10回", "10"],
        ["12回", "12"]
      ]), "COUNT");
    this.appendStatementInput("DO")
      .setCheck(null)
      .appendField("実行");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(270);
    this.setTooltip("中のブロックを指定回数繰り返すのだ！");
  }
};

pythonGenerator.forBlock['turtle_loop'] = function (block) {
  const count = block.getFieldValue('COUNT');
  let statements = pythonGenerator.statementToCode(block, 'DO');
  if (!statements) {
    statements = pythonGenerator.INDENT + 'pass\n';
  }
  return 'for i in range(' + count + '):\n' + statements;
};

// ===== 7. Pen Up（ペンを上げる）ブロック =====
Blockly.Blocks['turtle_penup'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🖊️ ペンを上げる");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setTooltip("ペンを上げて、線を描くないようにするのだ！");
  }
};

pythonGenerator.forBlock['turtle_penup'] = function (block) {
  return 't.penup()\n';
};

// ===== 8. Pen Down（ペンを下ろす）ブロック =====
Blockly.Blocks['turtle_pendown'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🖊️ ペンを下ろす");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setTooltip("ペンを下ろして、線を描くようにするのだ！");
  }
};

pythonGenerator.forBlock['turtle_pendown'] = function (block) {
  return 't.pendown()\n';
};

// ===== 9. Color（色変更）ブロック =====
Blockly.Blocks['turtle_color'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("🎨 色を変える")
      .appendField(new Blockly.FieldDropdown([
        ["赤 🔴", "red"],
        ["青 🔵", "blue"],
        ["緑 🟢", "green"],
        ["黄 🟡", "yellow"],
        ["紫 🟣", "purple"],
        ["黒 ⚫", "black"],
        ["オレンジ 🟠", "orange"],
        ["ピンク 🩷", "pink"]
      ]), "COLOR");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setTooltip("ペンの色を変えるのだ！");
  }
};

pythonGenerator.forBlock['turtle_color'] = function (block) {
  const color = block.getFieldValue('COLOR');
  return "t.color('" + color + "')\n";
};
