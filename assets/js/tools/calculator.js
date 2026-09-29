'use strict';

(() => {
  const HISTORY_KEY = 'epsilon_tools_calculator_history_v1';
  const ANGLE_KEY = 'epsilon_tools_calculator_angle_v1';
  const MAX_HISTORY = 5;

  const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'log', 'ln', 'abs']);
  const CONSTANTS = new Set(['pi', 'e', 'Ans']);

  window.EpsilonTools.registerTool('calculator', renderCalculator);

  function renderCalculator(root) {
    injectStyles();

    const state = {
      expression: '',
      result: '0',
      ans: 0,
      shift: false,
      angle: localStorage.getItem(ANGLE_KEY) === 'RAD' ? 'RAD' : 'DEG',
      justEvaluated: false,
      history: readHistory()
    };

    root.innerHTML = `
      <section class="ec-page">
        <div class="ec-toolbar">
          <button class="ec-home" type="button" data-command="home">← Tool Catalog</button>
          <div class="ec-toolbar-title">Esilon Calculator</div>
          <div class="ec-mode-chip" data-angle-chip>${state.angle}</div>
        </div>

        <div class="ec-workspace">
          <aside class="ec-history-card" aria-label="Lịch sử 5 phép tính gần nhất">
            <div class="ec-history-head">
              <div><strong>Lịch sử</strong><span>5 phép tính gần nhất</span></div>
              <button type="button" class="ec-clear-history" data-command="clear-history">Xóa</button>
            </div>
            <div class="ec-history-list" data-history></div>
          </aside>

          <div class="ec-calculator" aria-label="Esilon Calculator">
            <div class="ec-brand-row">
              <div>
                <div class="ec-brand-name">ESILON</div>
                <div class="ec-brand-sub">SCIENTIFIC CALCULATOR</div>
              </div>
              <div class="ec-model">EDU-570</div>
            </div>

            <div class="ec-screen" role="status" aria-live="polite">
              <div class="ec-screen-meta"><span data-angle>${state.angle}</span><span data-shift-indicator></span></div>
              <div class="ec-expression" data-expression>&nbsp;</div>
              <div class="ec-result" data-result>0</div>
            </div>

            <div class="ec-keypad" data-keypad>
              ${button('SHIFT', 'shift', 'special shift-key')}
              ${button(state.angle, 'angle', 'special', '', '', 'angle-button')}
              ${button('(', 'insert', 'soft', '(', '(')}
              ${button(')', 'insert', 'soft', ')', ')')}
              ${button('DEL', 'delete', 'danger-soft')}
              ${button('AC', 'clear', 'danger')}

              ${button('x²', 'square', 'function shiftable', '', '', '', '√', 'sqrt')}
              ${button('xʸ', 'insert', 'function', '^', '^')}
              ${button('log', 'function', 'function shiftable', 'log', '', '', '10ˣ', 'pow10')}
              ${button('ln', 'function', 'function shiftable', 'ln', '', '', 'eˣ', 'powe')}
              ${button('π', 'insert', 'function', 'pi', 'π')}
              ${button('e', 'insert', 'function', 'e', 'e')}

              ${button('sin', 'function', 'function shiftable', 'sin', '', '', 'sin⁻¹', 'asin')}
              ${button('cos', 'function', 'function shiftable', 'cos', '', '', 'cos⁻¹', 'acos')}
              ${button('tan', 'function', 'function shiftable', 'tan', '', '', 'tan⁻¹', 'atan')}
              ${button('√', 'function', 'function', 'sqrt')}
              ${button('x!', 'insert', 'function', '!', '!')}
              ${button('%', 'insert', 'function', '%', '%')}

              ${button('7', 'insert', 'number', '7', '7')}
              ${button('8', 'insert', 'number', '8', '8')}
              ${button('9', 'insert', 'number', '9', '9')}
              ${button('÷', 'insert', 'operator', '/', '÷')}
              ${button('Ans', 'insert', 'function', 'Ans', 'Ans')}
              ${button('EXP', 'exp', 'function')}

              ${button('4', 'insert', 'number', '4', '4')}
              ${button('5', 'insert', 'number', '5', '5')}
              ${button('6', 'insert', 'number', '6', '6')}
              ${button('×', 'insert', 'operator', '*', '×')}
              ${button('1/x', 'reciprocal', 'function')}
              ${button('|x|', 'function', 'function', 'abs')}

              ${button('1', 'insert', 'number', '1', '1')}
              ${button('2', 'insert', 'number', '2', '2')}
              ${button('3', 'insert', 'number', '3', '3')}
              ${button('−', 'insert', 'operator', '-', '−')}
              ${button('+', 'insert', 'operator', '+', '+')}
              ${button('=', 'equals', 'equals tall')}

              ${button('0', 'insert', 'number wide', '0', '0')}
              ${button('.', 'insert', 'number', '.', '.')}
              ${button('(−)', 'insert', 'function', '-', '−')}
            </div>
          </div>
        </div>
      </section>`;

    const refs = {
      expression: root.querySelector('[data-expression]'),
      result: root.querySelector('[data-result]'),
      angle: root.querySelector('[data-angle]'),
      angleChip: root.querySelector('[data-angle-chip]'),
      angleButton: root.querySelector('[data-angle-button]'),
      shiftIndicator: root.querySelector('[data-shift-indicator]'),
      history: root.querySelector('[data-history]'),
      keypad: root.querySelector('[data-keypad]')
    };

    updateDisplay();
    renderHistory();

    root.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);

    const observer = new MutationObserver(() => {
      if (!document.body.contains(root)) {
        window.removeEventListener('keydown', onKeyDown);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function onClick(event) {
      const historyItem = event.target.closest('[data-history-result]');
      if (historyItem) {
        state.expression = historyItem.dataset.historyResult || '';
        state.result = state.expression || '0';
        state.justEvaluated = true;
        updateDisplay();
        return;
      }

      const key = event.target.closest('[data-action]');
      if (!key) return;
      handleAction(key.dataset.action, key.dataset.value || '', key.dataset.display || '', key);
    }

    function onKeyDown(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key;

      if (/^[0-9.]$/.test(key)) return consumeKey(event, 'insert', key, key);
      if (key === '+') return consumeKey(event, 'insert', '+', '+');
      if (key === '-') return consumeKey(event, 'insert', '-', '−');
      if (key === '*') return consumeKey(event, 'insert', '*', '×');
      if (key === '/') return consumeKey(event, 'insert', '/', '÷');
      if (key === '^') return consumeKey(event, 'insert', '^', '^');
      if (key === '%') return consumeKey(event, 'insert', '%', '%');
      if (key === '(' || key === ')') return consumeKey(event, 'insert', key, key);
      if (key === 'Enter' || key === '=') return consumeKey(event, 'equals');
      if (key === 'Backspace') return consumeKey(event, 'delete');
      if (key === 'Escape' || key === 'Delete') return consumeKey(event, 'clear');
    }

    function consumeKey(event, action, value = '', display = '') {
      event.preventDefault();
      handleAction(action, value, display);
    }

    function handleAction(action, value, display, keyElement = null) {
      if (action === 'home') {
        window.EpsilonTools.goHome();
        return;
      }
      if (action === 'clear-history') {
        state.history = [];
        writeHistory(state.history);
        renderHistory();
        return;
      }
      if (action === 'shift') {
        state.shift = !state.shift;
        updateShiftKeys();
        updateDisplay();
        return;
      }
      if (action === 'angle') {
        state.angle = state.angle === 'DEG' ? 'RAD' : 'DEG';
        localStorage.setItem(ANGLE_KEY, state.angle);
        refs.angleButton.textContent = state.angle;
        refs.angleChip.textContent = state.angle;
        updateDisplay();
        return;
      }
      if (action === 'clear') {
        state.expression = '';
        state.result = '0';
        state.justEvaluated = false;
        updateDisplay();
        return;
      }
      if (action === 'delete') {
        if (state.justEvaluated) {
          state.expression = '';
          state.result = '0';
          state.justEvaluated = false;
        } else {
          state.expression = smartDelete(state.expression);
        }
        updateDisplay();
        return;
      }
      if (action === 'equals') {
        calculate();
        return;
      }
      if (action === 'function') {
        const actual = resolveShiftAction(keyElement, value);
        appendFunction(actual || value);
        return;
      }
      if (action === 'square') {
        const key = keyElement;
        if (state.shift && key?.dataset.shiftAction) appendFunction(key.dataset.shiftAction);
        else appendValue('^2', '^2');
        resetShiftAfterUse();
        return;
      }
      if (action === 'reciprocal') {
        if (state.justEvaluated && isFiniteNumberString(state.result)) {
          state.expression = `1/(${state.result})`;
          state.justEvaluated = false;
        } else {
          state.expression += '1/(';
        }
        updateDisplay();
        return;
      }
      if (action === 'exp') {
        appendValue('E', 'E');
        return;
      }
      if (action === 'pow10') {
        appendValue('10^(', '10^(');
        resetShiftAfterUse();
        return;
      }
      if (action === 'powe') {
        appendValue('e^(', 'e^(');
        resetShiftAfterUse();
        return;
      }
      if (action === 'insert') {
        appendValue(value, display || value);
      }
    }


    function resolveShiftAction(key, normalValue) {
      if (state.shift && key?.dataset.shiftAction) return key.dataset.shiftAction;
      return normalValue;
    }

    function appendFunction(name) {
      if (!name) return;
      if (name === 'pow10') {
        appendValue('10^(', '10^(');
      } else if (name === 'powe') {
        appendValue('e^(', 'e^(');
      } else {
        startNewIfNeeded(false);
        state.expression += `${name}(`;
        state.justEvaluated = false;
        updateDisplay();
      }
      resetShiftAfterUse();
    }

    function appendValue(value) {
      const isOperator = /^[+\-*/^]$/.test(value);
      startNewIfNeeded(isOperator);

      if (state.justEvaluated && isOperator) {
        state.expression = state.result;
      }
      state.justEvaluated = false;
      state.expression += value;
      updateDisplay();
    }

    function startNewIfNeeded(operatorContinuation) {
      if (!state.justEvaluated) return;
      if (operatorContinuation) state.expression = state.result;
      else state.expression = '';
      state.justEvaluated = false;
    }

    function calculate() {
      if (!state.expression.trim()) return;
      try {
        const value = evaluateExpression(state.expression, state.angle, state.ans);
        const formatted = formatNumber(value);
        const pretty = prettyExpression(state.expression);
        state.result = formatted;
        state.ans = value;
        state.justEvaluated = true;
        state.history.unshift({ expression: pretty, result: formatted, ts: Date.now() });
        state.history = state.history.slice(0, MAX_HISTORY);
        writeHistory(state.history);
        renderHistory();
        updateDisplay();
      } catch (err) {
        state.result = err?.message === 'Math ERROR' ? 'Math ERROR' : 'Syntax ERROR';
        state.justEvaluated = false;
        updateDisplay();
      }
    }

    function updateDisplay() {
      refs.expression.textContent = state.expression ? prettyExpression(state.expression) : '\u00A0';
      refs.result.textContent = state.result;
      refs.angle.textContent = state.angle;
      refs.angleChip.textContent = state.angle;
      refs.shiftIndicator.textContent = state.shift ? 'SHIFT' : '';
      refs.result.classList.toggle('error', /ERROR/.test(state.result));
    }

    function updateShiftKeys() {
      root.querySelectorAll('.shiftable').forEach(key => {
        const label = state.shift ? key.dataset.shiftLabel : key.dataset.normalLabel;
        if (label) key.textContent = label;
      });
      root.querySelector('.shift-key')?.classList.toggle('active', state.shift);
    }

    function resetShiftAfterUse() {
      if (!state.shift) return;
      state.shift = false;
      updateShiftKeys();
      updateDisplay();
    }

    function renderHistory() {
      if (!state.history.length) {
        refs.history.innerHTML = Array.from({ length: MAX_HISTORY }, (_, index) => `
          <div class="ec-history-empty"><span>${index + 1}</span><em>Chưa có phép tính</em></div>`).join('');
        return;
      }

      const rows = [...state.history];
      while (rows.length < MAX_HISTORY) rows.push(null);
      refs.history.innerHTML = rows.map((item, index) => {
        if (!item) return `<div class="ec-history-empty"><span>${index + 1}</span><em>—</em></div>`;
        return `
          <button type="button" class="ec-history-row" data-history-result="${escapeAttr(item.result)}" title="Dùng lại kết quả ${escapeAttr(item.result)}">
            <span class="ec-history-index">${index + 1}</span>
            <span class="ec-history-expression">${escapeHtml(item.expression)}</span>
            <strong>${escapeHtml(item.result)}</strong>
          </button>`;
      }).join('');
    }
  }

  function button(label, action, className = '', value = '', display = '', extraClass = '', shiftLabel = '', shiftAction = '') {
    const shiftAttrs = shiftLabel
      ? ` data-normal-label="${escapeAttr(label)}" data-shift-label="${escapeAttr(shiftLabel)}" data-shift-action="${escapeAttr(shiftAction)}"`
      : '';
    const angleAttr = extraClass === 'angle-button' ? ' data-angle-button' : '';
    return `<button type="button" class="ec-key ${className} ${extraClass}" data-action="${escapeAttr(action)}" data-value="${escapeAttr(value)}" data-display="${escapeAttr(display)}"${shiftAttrs}${angleAttr}>${escapeHtml(label)}</button>`;
  }

  function smartDelete(expression) {
    const tokens = ['asin(', 'acos(', 'atan(', 'sqrt(', 'log(', 'sin(', 'cos(', 'tan(', 'abs(', 'Ans', '10^(', 'e^('];
    for (const token of tokens) {
      if (expression.endsWith(token)) return expression.slice(0, -token.length);
    }
    return expression.slice(0, -1);
  }

  function prettyExpression(expression) {
    return expression
      .replaceAll('asin', 'sin⁻¹')
      .replaceAll('acos', 'cos⁻¹')
      .replaceAll('atan', 'tan⁻¹')
      .replaceAll('sqrt', '√')
      .replaceAll('pi', 'π')
      .replaceAll('*', '×')
      .replaceAll('/', '÷')
      .replaceAll('-', '−');
  }

  function evaluateExpression(expression, angleMode, ans) {
    const tokens = tokenize(expression);
    const withImplicitMultiplication = addImplicitMultiplication(tokens);
    const rpn = toRpn(withImplicitMultiplication);
    return evaluateRpn(rpn, angleMode, ans);
  }

  function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i];
      if (/\s/.test(char)) {
        i += 1;
        continue;
      }

      if (/[0-9.]/.test(char)) {
        const start = i;
        let seenDot = false;
        while (i < input.length && /[0-9.]/.test(input[i])) {
          if (input[i] === '.') {
            if (seenDot) throw new Error('Syntax ERROR');
            seenDot = true;
          }
          i += 1;
        }
        if (input[i] === 'E') {
          i += 1;
          if (input[i] === '+' || input[i] === '-') i += 1;
          const exponentStart = i;
          while (i < input.length && /[0-9]/.test(input[i])) i += 1;
          if (exponentStart === i) throw new Error('Syntax ERROR');
        }
        const raw = input.slice(start, i);
        if (raw === '.' || !Number.isFinite(Number(raw))) throw new Error('Syntax ERROR');
        tokens.push({ type: 'number', value: Number(raw) });
        continue;
      }

      if (/[A-Za-z]/.test(char)) {
        const start = i;
        while (i < input.length && /[A-Za-z]/.test(input[i])) i += 1;
        const ident = input.slice(start, i);
        if (FUNCTIONS.has(ident)) tokens.push({ type: 'function', value: ident });
        else if (CONSTANTS.has(ident)) tokens.push({ type: 'constant', value: ident });
        else throw new Error('Syntax ERROR');
        continue;
      }

      if ('+-*/^!%'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i += 1;
        continue;
      }
      if (char === '(') {
        tokens.push({ type: 'lparen', value: char });
        i += 1;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'rparen', value: char });
        i += 1;
        continue;
      }
      throw new Error('Syntax ERROR');
    }

    return tokens;
  }

  function addImplicitMultiplication(tokens) {
    const output = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const current = tokens[i];
      const previous = output[output.length - 1];
      if (previous && canEndValue(previous) && canStartValue(current)) {
        output.push({ type: 'operator', value: '*' });
      }
      output.push(current);
    }
    return output;
  }

  function canEndValue(token) {
    return token.type === 'number' || token.type === 'constant' || token.type === 'rparen' || (token.type === 'operator' && (token.value === '!' || token.value === '%'));
  }

  function canStartValue(token) {
    return token.type === 'number' || token.type === 'constant' || token.type === 'function' || token.type === 'lparen';
  }

  function toRpn(tokens) {
    const output = [];
    const stack = [];
    let previous = null;

    const precedence = { '+': 2, '-': 2, '*': 3, '/': 3, 'u+': 4, 'u-': 4, '^': 5 };
    const rightAssociative = new Set(['^', 'u+', 'u-']);

    for (const token of tokens) {
      if (token.type === 'number' || token.type === 'constant') {
        output.push(token);
      } else if (token.type === 'function') {
        stack.push(token);
      } else if (token.type === 'operator') {
        if (token.value === '!' || token.value === '%') {
          if (!previous || !canEndValue(previous)) throw new Error('Syntax ERROR');
          output.push(token);
          previous = token;
          continue;
        }

        let op = token.value;
        if ((op === '+' || op === '-') && (!previous || previous.type === 'operator' && previous.value !== '!' && previous.value !== '%' || previous.type === 'lparen')) {
          op = op === '+' ? 'u+' : 'u-';
        }
        const current = { type: 'operator', value: op };
        if (op === 'u+' || op === 'u-') {
          stack.push(current);
          previous = token;
          continue;
        }

        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === 'function') {
            output.push(stack.pop());
            continue;
          }
          if (top.type !== 'operator') break;
          const topPrec = precedence[top.value];
          const currentPrec = precedence[current.value];
          if (topPrec > currentPrec || (topPrec === currentPrec && !rightAssociative.has(current.value))) output.push(stack.pop());
          else break;
        }
        stack.push(current);
      } else if (token.type === 'lparen') {
        stack.push(token);
      } else if (token.type === 'rparen') {
        let foundLeft = false;
        while (stack.length) {
          const top = stack.pop();
          if (top.type === 'lparen') {
            foundLeft = true;
            break;
          }
          output.push(top);
        }
        if (!foundLeft) throw new Error('Syntax ERROR');
        if (stack.length && stack[stack.length - 1].type === 'function') output.push(stack.pop());
      }
      previous = token;
    }

    while (stack.length) {
      const top = stack.pop();
      if (top.type === 'lparen' || top.type === 'rparen') throw new Error('Syntax ERROR');
      output.push(top);
    }
    return output;
  }

  function evaluateRpn(rpn, angleMode, ans) {
    const stack = [];
    const toRadians = value => angleMode === 'DEG' ? value * Math.PI / 180 : value;
    const fromRadians = value => angleMode === 'DEG' ? value * 180 / Math.PI : value;

    for (const token of rpn) {
      if (token.type === 'number') {
        stack.push(token.value);
        continue;
      }
      if (token.type === 'constant') {
        if (token.value === 'pi') stack.push(Math.PI);
        else if (token.value === 'e') stack.push(Math.E);
        else stack.push(Number(ans) || 0);
        continue;
      }
      if (token.type === 'function') {
        if (stack.length < 1) throw new Error('Syntax ERROR');
        const x = stack.pop();
        let value;
        if (token.value === 'sin') value = Math.sin(toRadians(x));
        else if (token.value === 'cos') value = Math.cos(toRadians(x));
        else if (token.value === 'tan') value = Math.tan(toRadians(x));
        else if (token.value === 'asin') value = fromRadians(Math.asin(x));
        else if (token.value === 'acos') value = fromRadians(Math.acos(x));
        else if (token.value === 'atan') value = fromRadians(Math.atan(x));
        else if (token.value === 'sqrt') value = Math.sqrt(x);
        else if (token.value === 'log') value = Math.log10(x);
        else if (token.value === 'ln') value = Math.log(x);
        else if (token.value === 'abs') value = Math.abs(x);
        else throw new Error('Syntax ERROR');
        assertFinite(value);
        stack.push(value);
        continue;
      }
      if (token.type === 'operator') {
        if (token.value === 'u+' || token.value === 'u-') {
          if (stack.length < 1) throw new Error('Syntax ERROR');
          const x = stack.pop();
          stack.push(token.value === 'u-' ? -x : x);
          continue;
        }
        if (token.value === '!' || token.value === '%') {
          if (stack.length < 1) throw new Error('Syntax ERROR');
          const x = stack.pop();
          const value = token.value === '!' ? factorial(x) : x / 100;
          assertFinite(value);
          stack.push(value);
          continue;
        }
        if (stack.length < 2) throw new Error('Syntax ERROR');
        const b = stack.pop();
        const a = stack.pop();
        let value;
        if (token.value === '+') value = a + b;
        else if (token.value === '-') value = a - b;
        else if (token.value === '*') value = a * b;
        else if (token.value === '/') value = a / b;
        else if (token.value === '^') value = Math.pow(a, b);
        else throw new Error('Syntax ERROR');
        assertFinite(value);
        stack.push(value);
      }
    }

    if (stack.length !== 1) throw new Error('Syntax ERROR');
    assertFinite(stack[0]);
    return stack[0];
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Math ERROR');
    let result = 1;
    for (let i = 2; i <= value; i += 1) result *= i;
    return result;
  }

  function assertFinite(value) {
    if (!Number.isFinite(value) || Number.isNaN(value)) throw new Error('Math ERROR');
  }

  function formatNumber(value) {
    if (Object.is(value, -0)) value = 0;
    if (value === 0) return '0';
    const abs = Math.abs(value);
    if (abs >= 1e12 || abs < 1e-9) return value.toExponential(10).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e');
    return Number(value.toPrecision(12)).toString();
  }

  function isFiniteNumberString(value) {
    return value !== '' && Number.isFinite(Number(value));
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(item => item && typeof item.expression === 'string' && typeof item.result === 'string')
        .slice(0, MAX_HISTORY);
    } catch (_) {
      return [];
    }
  }

  function writeHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch (_) {
      // Calculator remains fully usable even if storage is unavailable.
    }
  }

  function injectStyles() {
    if (document.getElementById('epsilon-calculator-styles')) return;
    const style = document.createElement('style');
    style.id = 'epsilon-calculator-styles';
    style.textContent = `
      .ec-page{padding:18px;background:linear-gradient(180deg,#fbfbff,#fff)}
      .ec-toolbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:16px}
      .ec-home{justify-self:start;border:1px solid #ddd6fe;background:#faf5ff;color:#6d28d9;border-radius:11px;padding:9px 12px;font-weight:800;cursor:pointer}
      .ec-toolbar-title{font-weight:900;color:#312e81;font-size:18px;text-align:center}.ec-mode-chip{justify-self:end;background:#ede9fe;color:#6d28d9;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900}
      .ec-workspace{display:grid;grid-template-columns:minmax(220px,300px) minmax(320px,430px);gap:22px;justify-content:center;align-items:start}
      .ec-history-card{border:1px solid #e7e5e4;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(30,41,59,.06);overflow:hidden}
      .ec-history-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 15px 12px;border-bottom:1px solid #f1f5f9}.ec-history-head strong{display:block;color:#1e293b}.ec-history-head span{display:block;color:#94a3b8;font-size:11px;margin-top:2px}.ec-clear-history{border:0;background:#f8fafc;color:#64748b;border-radius:9px;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer}
      .ec-history-list{padding:8px}.ec-history-row,.ec-history-empty{min-height:58px;width:100%;display:grid;grid-template-columns:26px minmax(0,1fr);grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:8px;border:0;border-bottom:1px solid #f1f5f9;background:#fff;text-align:left}.ec-history-row{cursor:pointer;border-radius:10px}.ec-history-row:hover{background:#faf5ff}.ec-history-index,.ec-history-empty span{grid-row:1/3;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:900}.ec-history-expression{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#64748b;font-size:12px}.ec-history-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111827;font-size:15px}.ec-history-empty em{grid-row:1/3;color:#cbd5e1;font-style:normal;font-size:12px}
      .ec-calculator{background:linear-gradient(180deg,#2f363b,#1f2529);border:1px solid #15191c;border-radius:24px;padding:18px 16px 16px;box-shadow:0 18px 40px rgba(15,23,42,.24),inset 0 1px 0 rgba(255,255,255,.12);user-select:none}
      .ec-brand-row{display:flex;justify-content:space-between;align-items:start;color:#f8fafc;padding:0 5px 12px}.ec-brand-name{font-weight:900;letter-spacing:.16em;font-size:17px}.ec-brand-sub{font-size:8px;letter-spacing:.13em;color:#facc15;margin-top:2px}.ec-model{font-size:10px;font-style:italic;color:#e2e8f0;padding-top:3px}
      .ec-screen{background:linear-gradient(180deg,#d8dfc6,#c9d1b5);border:4px solid #11181c;border-radius:8px;min-height:118px;padding:9px 11px 8px;box-shadow:inset 0 1px 5px rgba(0,0,0,.25);margin-bottom:14px;font-family:"Courier New",monospace;color:#111}
      .ec-screen-meta{display:flex;justify-content:space-between;min-height:17px;font-size:11px;font-weight:900}.ec-screen-meta span:last-child{color:#9a3412}.ec-expression{min-height:30px;font-size:15px;text-align:left;white-space:nowrap;overflow-x:auto;scrollbar-width:none}.ec-expression::-webkit-scrollbar{display:none}.ec-result{font-size:31px;line-height:1.1;text-align:right;font-weight:700;white-space:nowrap;overflow-x:auto;scrollbar-width:none}.ec-result.error{font-size:22px;color:#7f1d1d}.ec-result::-webkit-scrollbar{display:none}
      .ec-keypad{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.ec-key{min-width:0;height:38px;border:0;border-radius:8px;cursor:pointer;font-weight:900;font-size:14px;color:#f8fafc;background:linear-gradient(180deg,#626b72,#424a50);box-shadow:0 3px 0 #11171a,inset 0 1px 0 rgba(255,255,255,.18);transition:transform .04s ease,filter .12s ease}.ec-key:hover{filter:brightness(1.08)}.ec-key:active{transform:translateY(2px);box-shadow:0 1px 0 #11171a}.ec-key.function{font-size:12px;background:linear-gradient(180deg,#515b62,#343c42)}.ec-key.operator{background:linear-gradient(180deg,#69747b,#4c555b);font-size:19px}.ec-key.number{background:linear-gradient(180deg,#85919a,#626d75);font-size:18px}.ec-key.special{background:linear-gradient(180deg,#43505a,#2f3940);color:#fde047;font-size:11px}.ec-key.special.active{background:linear-gradient(180deg,#7c3aed,#5b21b6);color:#fff}.ec-key.soft{background:linear-gradient(180deg,#5e686f,#434c52)}.ec-key.danger-soft{background:linear-gradient(180deg,#9f7aea,#7c3aed)}.ec-key.danger{background:linear-gradient(180deg,#f87171,#dc2626)}.ec-key.equals{background:linear-gradient(180deg,#60a5fa,#2563eb);font-size:20px}.ec-key.tall{grid-row:span 2;height:auto}.ec-key.wide{grid-column:span 2}
      @media(max-width:820px){.ec-workspace{grid-template-columns:minmax(0,430px)}.ec-history-card{order:2}.ec-calculator{order:1}.ec-history-list{display:grid;grid-template-columns:1fr}.ec-toolbar{grid-template-columns:auto 1fr auto}.ec-toolbar-title{font-size:16px}}
      @media(max-width:480px){.ec-page{padding:10px}.ec-toolbar{gap:7px}.ec-home{padding:8px 9px;font-size:12px}.ec-mode-chip{padding:6px 8px}.ec-calculator{border-radius:19px;padding:14px 10px 12px}.ec-keypad{gap:6px}.ec-key{height:36px;font-size:12px;border-radius:7px}.ec-key.number{font-size:17px}.ec-key.operator{font-size:18px}.ec-screen{min-height:110px}.ec-result{font-size:28px}}
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('`', '&#096;');
  }
})();
