/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Elegant scientific calculator core client operations.
 * Pure mathematical parser (no eval).
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Nodes References ---
  const loaderEl = document.getElementById('loader');
  const mainDisplayEl = document.getElementById('main-display');
  const previewDisplayEl = document.getElementById('preview-display');
  const expressionDisplayEl = document.getElementById('expression-display');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const copyBtn = document.getElementById('copy-btn');
  const copyDefaultIcon = document.getElementById('copy-default-icon');
  const copySuccessIcon = document.getElementById('copy-success-icon');
  const keysContainer = document.querySelector('.keyboard-grid');

  // --- Core Application State ---
  let currentExpression = '0'; // Active algebraic mathematical string
  let isDisplayingResult = false; // Flag for showing fresh compilation outputs

  // --- Constants ---
  const OPERATORS = ['+', '-', '×', '÷', '%'];
  const MATH_SYMBOLS_MAP = {
    '*': '×',
    '/': '÷',
    'x': '×',
    'X': '×'
  };

  const opPrecedence = {
    '+': 1,
    '-': 1,
    '×': 2,
    '÷': 2,
    '^': 3,
    'UNARY_MINUS': 4,
    'UNARY_PLUS': 4,
    'sin': 5,
    'cos': 5,
    'tan': 5,
    'log': 5,
    'ln': 5,
    '√': 5
  };

  // --- 1. Pure Custom Math Parser (No eval) ---

  /**
   * Tokenizes an algebraic mathematical expression string
   */
  function tokenize(expression) {
    const tokens = [];
    let i = 0;
    const len = expression.length;

    while (i < len) {
      const char = expression[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Check multi-character operators/functions first
      if (expression.slice(i, i + 3) === 'sin') {
        tokens.push('sin');
        i += 3;
      } else if (expression.slice(i, i + 3) === 'cos') {
        tokens.push('cos');
        i += 3;
      } else if (expression.slice(i, i + 3) === 'tan') {
        tokens.push('tan');
        i += 3;
      } else if (expression.slice(i, i + 3) === 'log') {
        tokens.push('log');
        i += 3;
      } else if (expression.slice(i, i + 2) === 'ln') {
        tokens.push('ln');
        i += 2;
      } else if (char === '√') {
        tokens.push('√');
        i++;
      } else if (char === 'π') {
        tokens.push(Math.PI);
        i++;
      } else if (char === 'e') {
        tokens.push(Math.E);
        i++;
      } else if (char === '(') {
        tokens.push('(');
        i++;
      } else if (char === ')') {
        tokens.push(')');
        i++;
      } else if (char === '^') {
        tokens.push('^');
        i++;
      }
      // Basic Operators
      else if (['+', '-', '×', '÷', '%', '*', '/'].includes(char)) {
        const symbol = MATH_SYMBOLS_MAP[char] || char;

        // Unary detection:
        // A '-' or '+' is unary if it starts the expression OR follows another operator/paren/function
        let isUnary = false;
        if (symbol === '-' || symbol === '+') {
          if (tokens.length === 0) {
            isUnary = true;
          } else {
            const previousToken = tokens[tokens.length - 1];
            if (['+', '-', '×', '÷', '^', '(', 'sin', 'cos', 'tan', 'log', 'ln', '√'].includes(previousToken)) {
              isUnary = true;
            }
          }
        }

        if (isUnary) {
          tokens.push(symbol === '-' ? 'UNARY_MINUS' : 'UNARY_PLUS');
        } else {
          tokens.push(symbol);
        }
        i++;
      }
      // Numeric Parsing Blocks
      else if (/[0-9.]/.test(char)) {
        let numericBuffer = '';
        while (i < len && /[0-9.]/.test(expression[i])) {
          numericBuffer += expression[i];
          i++;
        }

        // Validate multiple dots
        if ((numericBuffer.match(/\./g) || []).length > 1) {
          throw new Error('Malformed Number');
        }

        tokens.push(parseFloat(numericBuffer));
      } else {
        throw new Error('Invalid Char');
      }
    }

    return tokens;
  }

  /**
   * Evaluates token lists using Shunting-yard Algorithm
   */
  function evaluateTokens(tokens) {
    const values = [];
    const operators = [];

    function executeOperation() {
      if (operators.length === 0) return;
      const op = operators.pop();

      if (op === 'UNARY_MINUS') {
        if (values.length < 1) throw new Error('Syntax Error');
        const num = values.pop();
        values.push(-num);
      } else if (op === 'UNARY_PLUS') {
        if (values.length < 1) throw new Error('Syntax Error');
        // Unary plus remains unchanged
      } else if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(op)) {
        if (values.length < 1) throw new Error('Syntax Error');
        const num = values.pop();
        switch (op) {
          case 'sin':
            values.push(Math.sin(num));
            break;
          case 'cos':
            values.push(Math.cos(num));
            break;
          case 'tan':
            values.push(Math.tan(num));
            break;
          case 'log':
            if (num <= 0) throw new Error('Domain Error');
            values.push(Math.log10(num));
            break;
          case 'ln':
            if (num <= 0) throw new Error('Domain Error');
            values.push(Math.log(num));
            break;
          case '√':
            if (num < 0) throw new Error('Domain Error');
            values.push(Math.sqrt(num));
            break;
        }
      } else {
        if (values.length < 2) throw new Error('Syntax Error');
        const rightNum = values.pop();
        const leftNum = values.pop();

        switch (op) {
          case '+':
            values.push(leftNum + rightNum);
            break;
          case '-':
            values.push(leftNum - rightNum);
            break;
          case '×':
            values.push(leftNum * rightNum);
            break;
          case '÷':
            if (rightNum === 0) {
              throw new Error('Div by Zero');
            }
            values.push(leftNum / rightNum);
            break;
          case '^':
            values.push(Math.pow(leftNum, rightNum));
            break;
          default:
            throw new Error('Unknown Operator');
        }
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (typeof token === 'number') {
        values.push(token);
      } else if (token === '(') {
        operators.push('(');
      } else if (token === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          executeOperation();
        }
        if (operators.length === 0) throw new Error('Mismatched Parens');
        operators.pop(); // Pop '('
      } else if (token === '%') {
        if (values.length < 1) throw new Error('Syntax Error');
        const num = values.pop();
        values.push(num / 100);
      } else {
        const isRightAssoc = (token === '^' || token === 'UNARY_MINUS' || token === 'UNARY_PLUS');
        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '(' &&
          (opPrecedence[operators[operators.length - 1]] > opPrecedence[token] ||
           (opPrecedence[operators[operators.length - 1]] === opPrecedence[token] && !isRightAssoc))
        ) {
          executeOperation();
        }
        operators.push(token);
      }
    }

    while (operators.length > 0) {
      if (operators[operators.length - 1] === '(') throw new Error('Mismatched Parens');
      executeOperation();
    }

    if (values.length !== 1) {
      throw new Error('Syntax Error');
    }

    return values[0];
  }

  /**
   * Main calculation wrapper incorporating auto-closing of parentheses
   */
  function calculateExpression(expressionStr) {
    let sanitized = expressionStr.trim();
    if (!sanitized || sanitized === '0') return '0';

    // Auto-close unbalanced parentheses at the end to guide dynamic typing
    let openCount = 0;
    for (const char of sanitized) {
      if (char === '(') openCount++;
      else if (char === ')') openCount = Math.max(0, openCount - 1);
    }
    sanitized += ')'.repeat(openCount);

    try {
      const tokens = tokenize(sanitized);
      const output = evaluateTokens(tokens);

      if (isNaN(output) || !isFinite(output)) {
        return 'Error';
      }

      if (output % 1 !== 0) {
        // Precision ceiling to prevent display breaking
        return parseFloat(output.toFixed(8)).toString();
      }

      return output.toString();
    } catch (err) {
      return 'Error';
    }
  }


  // --- 2. Interactive App Mechanics ---

  /**
   * Smoothly hides the initialization loader page
   */
  function loadComplete() {
    if (loaderEl) {
      loaderEl.classList.add('fade-out');
    }
  }

  /**
   * Beautiful progressive simulated loading experience
   */
  function simulateLoader() {
    const progressFill = document.getElementById('loader-progress-fill');
    const percentEl = document.getElementById('loader-percent');
    
    if (!progressFill || !percentEl) {
      loadComplete();
      return;
    }
    
    let progress = 0;
    const progressSteps = [
      { prg: 20, text: "Loading Core Math Module..." },
      { prg: 50, text: "Compiling Scientific Functions..." },
      { prg: 80, text: "Initializing High-Contrast Panels..." },
      { prg: 100, text: "System Online." }
    ];
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        progressFill.style.width = '100%';
        percentEl.textContent = '100%';
        clearInterval(interval);
        setTimeout(() => {
          loadComplete();
        }, 300);
      } else {
        progressFill.style.width = progress + '%';
        percentEl.textContent = progress + '%';
        
        if (stepIndex < progressSteps.length && progress >= progressSteps[stepIndex].prg) {
          const loaderTextEl = document.querySelector('.loader-text');
          if (loaderTextEl) {
            loaderTextEl.textContent = progressSteps[stepIndex].text;
          }
          stepIndex++;
        }
      }
    }, 40);
  }

  /**
   * Real-time live clock date visualizer widget
   */
  function initClock() {
    const clockEl = document.getElementById('digital-clock');
    const dateEl = document.getElementById('current-date');
    if (!clockEl || !dateEl) return;

    function updateTime() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${hh}:${mm}:${ss}`;

      const options = { weekday: 'short', month: 'short', day: '2-digit' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
    
    updateTime();
    setInterval(updateTime, 1000);
  }

  /**
   * Update screens
   */
  function updateDisplays() {
    if (isDisplayingResult) {
      // Result is displayed already on evaluation
    } else {
      expressionDisplayEl.textContent = currentExpression === '0' ? '' : currentExpression;
      mainDisplayEl.textContent = currentExpression;
      generateLivePreview();
    }
  }

  /**
   * Real-time preview calculation generator
   */
  function generateLivePreview() {
    let cleanExp = currentExpression.trim();

    if (cleanExp === '0' || cleanExp === '') {
      previewDisplayEl.textContent = '';
      return;
    }

    // Strip trailing operators to evaluate progressive preview cleanly
    while (cleanExp && (OPERATORS.includes(cleanExp[cleanExp.length - 1]) || cleanExp[cleanExp.length - 1] === '^')) {
      cleanExp = cleanExp.slice(0, -1).trim();
    }

    if (!cleanExp || !hasEvaluatableElements(cleanExp)) {
      previewDisplayEl.textContent = '';
      return;
    }

    try {
      const liveRet = calculateExpression(cleanExp);
      if (liveRet !== 'Error' && liveRet !== currentExpression) {
        previewDisplayEl.textContent = '= ' + liveRet;
      } else {
        previewDisplayEl.textContent = '';
      }
    } catch (e) {
      previewDisplayEl.textContent = '';
    }
  }

  function hasEvaluatableElements(str) {
    // Check if it has operators, functions, or brackets
    for (const op of OPERATORS) {
      if (str.includes(op)) return true;
    }
    if (str.includes('^') || str.includes('(')) return true;
    const functions = ['sin', 'cos', 'tan', 'log', 'ln', '√'];
    for (const f of functions) {
      if (str.includes(f)) return true;
    }
    return false;
  }

  /**
   * Intelligent character input appending and routing
   */
  function handleInputCharacter(char) {
    if (isDisplayingResult) {
      // Clear screen on typing numbers right after evaluation output
      if (/[0-9.eπ(]/.test(char) || ['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(char)) {
        currentExpression = '0';
      }
      isDisplayingResult = false;
    }

    const lastChar = currentExpression[currentExpression.length - 1];

    if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(char)) {
      if (currentExpression === '0') {
        currentExpression = char + '(';
      } else {
        // Handle implicit multiplication like 5sin( -> 5×sin(
        if (/[0-9eπ)]/.test(lastChar)) {
          currentExpression += '×' + char + '(';
        } else {
          currentExpression += char + '(';
        }
      }
    } else if (char === 'π' || char === 'e') {
      if (currentExpression === '0') {
        currentExpression = char;
      } else {
        if (/[0-9eπ)]/.test(lastChar)) {
          currentExpression += '×' + char;
        } else {
          currentExpression += char;
        }
      }
    } else if (char === '(') {
      if (currentExpression === '0') {
        currentExpression = '(';
      } else {
        if (/[0-9eπ)]/.test(lastChar)) {
          currentExpression += '×(';
        } else {
          currentExpression += '(';
        }
      }
    } else if (char === ')') {
      if (currentExpression === '0') return; // Cannot start with closed brackets
      currentExpression += ')';
    } else if (/[0-9]/.test(char)) {
      if (currentExpression === '0') {
        currentExpression = char;
      } else {
        // Prevent sticking numbers straight after closed bracket, π, or e without multiplication
        if (/[eπ)]/.test(lastChar)) {
          currentExpression += '×' + char;
        } else {
          currentExpression += char;
        }
      }
    } else if (char === '.') {
      // Find the last numeric part being typed to ensure only one decimal point
      let lastBlock = '';
      for (let idx = currentExpression.length - 1; idx >= 0; idx--) {
        const c = currentExpression[idx];
        if (/[0-9.]/.test(c)) {
          lastBlock = c + lastBlock;
        } else {
          break;
        }
      }
      if (!lastBlock.includes('.')) {
        if (lastBlock === '') {
          currentExpression += '0.';
        } else {
          currentExpression += '.';
        }
      }
    } else if (OPERATORS.includes(char) || char === '^') {
      if (char === '%') {
        // Postfix percentage sitting behind numbers/constants
        if (/[0-9eπ)]/.test(lastChar)) {
          currentExpression += '%';
        }
      } else {
        // Swap operators if clicking consecutive operators
        if (OPERATORS.includes(lastChar) || lastChar === '^') {
          currentExpression = currentExpression.slice(0, -1) + char;
        } else {
          currentExpression += char;
        }
      }
    }

    updateDisplays();
  }

  /**
   * Cleans buffer back one character
   */
  function handleBackspace() {
    if (isDisplayingResult) {
      currentExpression = '0';
      isDisplayingResult = false;
      expressionDisplayEl.textContent = '';
      mainDisplayEl.textContent = '0';
      previewDisplayEl.textContent = '';
      return;
    }

    // Trace back spelling for function names to delete them cleanly (e.g. sin( -> deletes 4 chars)
    const functionsToDelete = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√('];
    let matchedFunc = null;

    for (const f of functionsToDelete) {
      if (currentExpression.endsWith(f)) {
        matchedFunc = f;
        break;
      }
    }

    if (matchedFunc) {
      currentExpression = currentExpression.slice(0, -matchedFunc.length) || '0';
    } else {
      if (currentExpression.length <= 1) {
        currentExpression = '0';
      } else {
        currentExpression = currentExpression.slice(0, -1);
      }
    }

    updateDisplays();
  }

  /**
   * Main calculation triggers on evaluation (=)
   */
  function handleEvaluate() {
    if (isDisplayingResult) return;

    let evalString = currentExpression;

    // Remove any trailing operations
    while (evalString && (OPERATORS.includes(evalString[evalString.length - 1]) || evalString[evalString.length - 1] === '^')) {
      evalString = evalString.slice(0, -1).trim();
    }

    if (!evalString) return;

    const finalVal = calculateExpression(evalString);

    if (finalVal === 'Error' || finalVal === 'Div by Zero' || finalVal === 'Domain Error' || finalVal === 'Syntax Error') {
      mainDisplayEl.textContent = finalVal;
      previewDisplayEl.textContent = '';
      isDisplayingResult = true;

      const displayContainer = document.querySelector('.display-container');
      if (displayContainer) {
        displayContainer.classList.add('shake-error');
        setTimeout(() => {
          displayContainer.classList.remove('shake-error');
        }, 500);
      }
      return;
    }

    expressionDisplayEl.textContent = currentExpression + ' =';
    currentExpression = finalVal;
    mainDisplayEl.textContent = finalVal;
    previewDisplayEl.textContent = '';
    isDisplayingResult = true;
  }

  /**
   * Resets entire math container
   */
  function handleAllClear() {
    currentExpression = '0';
    isDisplayingResult = false;
    expressionDisplayEl.textContent = '';
    mainDisplayEl.textContent = '0';
    previewDisplayEl.textContent = '';
  }


  // --- 3. Clipboard Management ---

  function copyToClipboard() {
    const valueToCopy = mainDisplayEl.textContent;
    if (!valueToCopy || valueToCopy === 'Error' || (valueToCopy === '0' && currentExpression === '0')) return;

    navigator.clipboard.writeText(valueToCopy)
      .then(() => {
        copyDefaultIcon.classList.add('hidden');
        copySuccessIcon.classList.remove('hidden');
        copyBtn.classList.add('show-tooltip');

        setTimeout(() => {
          copyDefaultIcon.classList.remove('hidden');
          copySuccessIcon.classList.add('hidden');
          copyBtn.classList.remove('show-tooltip');
        }, 1500);
      })
      .catch((err) => {
        console.error('Failed copying: ', err);
      });
  }


  // --- 4. Theme System ---

  function initTheme() {
    setTheme('dark');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const targetTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(targetTheme);
  }


  // --- 5. Event Bindings Layer ---

  keysContainer.addEventListener('click', (e) => {
    const button = e.target.closest('.key');
    if (!button) return;

    const keyValue = button.getAttribute('data-key');

    if (keyValue) {
      if (keyValue === 'AllClear') {
        handleAllClear();
      } else if (keyValue === 'Backspace') {
        handleBackspace();
      } else if (keyValue === '=') {
        handleEvaluate();
      } else {
        handleInputCharacter(keyValue);
      }
    }
  });

  themeToggleBtn.addEventListener('click', toggleTheme);
  copyBtn.addEventListener('click', copyToClipboard);

  // Keyboard Event listeners mapping
  document.addEventListener('keydown', (e) => {
    let key = e.key;

    if (key === 'Escape') {
      e.preventDefault();
      animateAndTriggerBtn('key-ac', () => handleAllClear());
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      animateAndTriggerBtn('key-del', () => handleBackspace());
      return;
    }

    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      animateAndTriggerBtn('key-equal', () => handleEvaluate());
      return;
    }

    if (key === 'c' || key === 'C') {
      if (isDisplayingResult) {
        e.preventDefault();
        copyToClipboard();
        return;
      }
    }

    // Numeric, constants, decimal, and basic operators mapping
    if (/[0-9.]/.test(key)) {
      e.preventDefault();
      const matchBtn = Array.from(document.querySelectorAll('.key')).find(btn => btn.getAttribute('data-key') === key);
      if (matchBtn) {
        animateAndTriggerBtn(matchBtn, () => handleInputCharacter(key));
      }
    } else if (['+', '-', '*', '/', '%', '^', '(', ')'].includes(key)) {
      e.preventDefault();
      const symbol = MATH_SYMBOLS_MAP[key] || key;
      const matchBtn = Array.from(document.querySelectorAll('.key')).find(btn => btn.getAttribute('data-key') === symbol);
      if (matchBtn) {
        animateAndTriggerBtn(matchBtn, () => handleInputCharacter(symbol));
      }
    }
  });

  function animateAndTriggerBtn(buttonSelectorOrElement, callback) {
    let element;
    if (typeof buttonSelectorOrElement === 'string') {
      element = document.getElementById(buttonSelectorOrElement);
    } else {
      element = buttonSelectorOrElement;
    }

    if (!element) return;

    element.style.transform = 'scale(0.92)';
    setTimeout(() => {
      element.style.transform = '';
      callback();
    }, 110);
  }

  // Fire systems
  initTheme();
  simulateLoader();
  initClock();
});
