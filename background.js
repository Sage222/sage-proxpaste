// ── Inject panel into top frame only ────────────────────────────────────────
async function injectPanel(tabId) {
  const { typingSpeed = 50 } = await chrome.storage.local.get(['typingSpeed']);
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: openPastePanel,
    args: [typingSpeed]
  });
}

// Icon click — open panel immediately, no popup
chrome.action.onClicked.addListener((tab) => {
  if (!tab || tab.url.startsWith('chrome://')) return;
  injectPanel(tab.id);
});

// Keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-paste-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.url.startsWith('chrome://')) return;
  injectPanel(tab.id);
});

// Messages from injected panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendKeystrokes') {
    const { text, typingSpeed } = request;
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return;
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: runKeystrokes,
        args: [text, typingSpeed]
      });
    });
  }
});

// ── Keystroke simulator — injected into every frame, runs where canvas exists
function runKeystrokes(text, typingSpeed) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  function getKeyInfo(char) {
    const map = {
      ' ':  { key: ' ',    code: 'Space' },
      '\n': { key: 'Enter',code: 'Enter' },
      '\r': { key: 'Enter',code: 'Enter' },
      '\t': { key: 'Tab',  code: 'Tab'   },
      '!':  { key: '!', code: 'Digit1',      shift: true },
      '@':  { key: '@', code: 'Digit2',      shift: true },
      '#':  { key: '#', code: 'Digit3',      shift: true },
      '$':  { key: '$', code: 'Digit4',      shift: true },
      '%':  { key: '%', code: 'Digit5',      shift: true },
      '^':  { key: '^', code: 'Digit6',      shift: true },
      '&':  { key: '&', code: 'Digit7',      shift: true },
      '*':  { key: '*', code: 'Digit8',      shift: true },
      '(':  { key: '(', code: 'Digit9',      shift: true },
      ')':  { key: ')', code: 'Digit0',      shift: true },
      '_':  { key: '_', code: 'Minus',       shift: true },
      '+':  { key: '+', code: 'Equal',       shift: true },
      '{':  { key: '{', code: 'BracketLeft', shift: true },
      '}':  { key: '}', code: 'BracketRight',shift: true },
      '|':  { key: '|', code: 'Backslash',   shift: true },
      ':':  { key: ':', code: 'Semicolon',   shift: true },
      '"':  { key: '"', code: 'Quote',       shift: true },
      '<':  { key: '<', code: 'Comma',       shift: true },
      '>':  { key: '>', code: 'Period',      shift: true },
      '?':  { key: '?', code: 'Slash',       shift: true },
      '~':  { key: '~', code: 'Backquote',   shift: true },
      '-':  { key: '-', code: 'Minus'        },
      '=':  { key: '=', code: 'Equal'        },
      '[':  { key: '[', code: 'BracketLeft'  },
      ']':  { key: ']', code: 'BracketRight' },
      '\\': { key: '\\',code: 'Backslash'    },
      ';':  { key: ';', code: 'Semicolon'    },
      "'":  { key: "'", code: 'Quote'        },
      ',':  { key: ',', code: 'Comma'        },
      '.':  { key: '.', code: 'Period'       },
      '/':  { key: '/', code: 'Slash'        },
      '`':  { key: '`', code: 'Backquote'   },
    };
    if (map[char]) return map[char];
    const isUpper = char >= 'A' && char <= 'Z';
    const isDigit = char >= '0' && char <= '9';
    if (isDigit) return { key: char, code: 'Digit' + char };
    return { key: char, code: 'Key' + char.toUpperCase(), shift: isUpper };
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function go() {
    canvas.focus();
    await delay(150);

    for (const char of text) {
      const info     = getKeyInfo(char);
      const charCode = char.charCodeAt(0);

      if (info.shift) {
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true, cancelable: true, composed: true,
          key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, shiftKey: true
        }));
        await delay(Math.max(5, typingSpeed * 0.1));
      }

      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true, cancelable: true, composed: true,
        key: info.key, code: info.code, keyCode: charCode, which: charCode, shiftKey: !!info.shift
      }));
      await delay(Math.max(5, typingSpeed * 0.15));
      canvas.dispatchEvent(new KeyboardEvent('keypress', {
        bubbles: true, cancelable: true, composed: true,
        key: info.key, code: info.code, keyCode: charCode, which: charCode,
        charCode: charCode, shiftKey: !!info.shift
      }));
      await delay(Math.max(5, typingSpeed * 0.15));
      canvas.dispatchEvent(new KeyboardEvent('keyup', {
        bubbles: true, cancelable: true, composed: true,
        key: info.key, code: info.code, keyCode: charCode, which: charCode, shiftKey: !!info.shift
      }));

      if (info.shift) {
        await delay(Math.max(5, typingSpeed * 0.1));
        canvas.dispatchEvent(new KeyboardEvent('keyup', {
          bubbles: true, cancelable: true, composed: true,
          key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, shiftKey: false
        }));
      }

      await delay(typingSpeed);
    }
  }

  go();
}

// ── Panel UI — injected into top frame only ──────────────────────────────────
function openPastePanel(typingSpeed) {
  const existing = document.getElementById('__proxmox_paste_panel__');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = '__proxmox_paste_panel__';
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    background: #1e1e2e; border: 1px solid #45475a;
    border-radius: 10px; padding: 16px; width: 420px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    font-family: system-ui, sans-serif;
  `;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="color:#cdd6f4;font-size:14px;font-weight:600;">📋 Proxmox Paste</span>
      <span id="__ppp_close__" style="color:#6c7086;cursor:pointer;font-size:18px;">✕</span>
    </div>
    <div style="color:#a6adc8;font-size:12px;margin-bottom:8px;">
      Paste with <kbd style="background:#313244;color:#cdd6f4;padding:2px 6px;border-radius:4px;font-size:11px;">Ctrl+V</kbd>
      then press <kbd style="background:#313244;color:#cdd6f4;padding:2px 6px;border-radius:4px;font-size:11px;">Enter</kbd> or click Send
    </div>
    <textarea id="__ppp_textarea__" placeholder="Paste your text here (Ctrl+V)..." style="
      width:100%;height:100px;background:#313244;color:#cdd6f4;
      border:1px solid #45475a;border-radius:6px;padding:8px;
      font-size:13px;font-family:monospace;resize:vertical;
      box-sizing:border-box;outline:none;
    "></textarea>
    <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
      <button id="__ppp_cancel__" style="
        background:transparent;color:#6c7086;border:1px solid #45475a;
        padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;
      ">Cancel</button>
      <button id="__ppp_send__" style="
        background:#89b4fa;color:#1e1e2e;border:none;
        padding:6px 18px;border-radius:6px;cursor:pointer;
        font-size:13px;font-weight:600;
      ">Send ↵</button>
    </div>
  `;

  document.body.appendChild(panel);

  const textarea  = document.getElementById('__ppp_textarea__');
  const sendBtn   = document.getElementById('__ppp_send__');
  const cancelBtn = document.getElementById('__ppp_cancel__');
  const closeBtn  = document.getElementById('__ppp_close__');

  textarea.focus();

  function doSend() {
    const text = textarea.value;
    if (!text) return;
    panel.remove();
    chrome.runtime.sendMessage({ action: 'sendKeystrokes', text, typingSpeed });
  }

  sendBtn.addEventListener('click', doSend);
  cancelBtn.addEventListener('click', () => panel.remove());
  closeBtn.addEventListener('click',  () => panel.remove());

  textarea.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    if (e.key === 'Escape') panel.remove();
  });
  panel.addEventListener('keydown',  e => e.stopPropagation());
  panel.addEventListener('keyup',    e => e.stopPropagation());
  panel.addEventListener('keypress', e => e.stopPropagation());
}
