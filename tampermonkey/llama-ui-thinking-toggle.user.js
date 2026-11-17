// ==UserScript==
// @name         llama-ui 思考开关
// @namespace    https://github.com/L6H7Q7
// @version      1.0.0
// @description  在 llama.cpp 网页（127.0.0.1:8080）的模型选择器左侧增加「思考：开/关」开关，通过注入请求参数控制思考（thinking / reasoning）模式
// @match        http://127.0.0.1:8080/*
// @match        http://localhost:8080/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BTN_ID = 'lq-thinking-toggle';
  const STATE_KEY = 'lq.thinking.off';
  const INPUT_AREA_SELECTOR = '[data-slot="input-area"]';
  const MODEL_TEXT_RE = /gemma|qwen|gguf|llama|\d{1,2}\s*B\b/i;

  // 默认关闭思考（与实测结论一致：视觉/模板类任务开思考只会更慢）
  function isThinkingOff() {
    const value = localStorage.getItem(STATE_KEY);
    return value === null ? true : value === '1';
  }

  function setThinkingOff(off) {
    localStorage.setItem(STATE_KEY, off ? '1' : '0');
  }

  // ---------- 1. 拦截请求，注入或移除思考参数 ----------
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isChat = /\/v1\/chat\/completions|\/chat\/completions|\/v1\/completions|\/completion/.test(url);
      if (isChat && init && typeof init.body === 'string') {
        const body = JSON.parse(init.body);
        if (isThinkingOff()) {
          body.reasoning_effort = 'none';
          body.chat_template_kwargs = Object.assign({}, body.chat_template_kwargs, {
            enable_thinking: false
          });
          body.thinking_budget_tokens = 0;
        } else {
          delete body.reasoning_effort;
          delete body.thinking_budget_tokens;
          if (body.chat_template_kwargs) {
            delete body.chat_template_kwargs.enable_thinking;
          }
        }
        init = Object.assign({}, init, { body: JSON.stringify(body) });
      }
    } catch (error) {
      // 请求体不是 JSON 或并非聊天请求时原样放行
    }
    return originalFetch.call(this, input, init);
  };

  // ---------- 2. 开关按钮 ----------
  let button = null;

  function renderButton() {
    if (!button) {
      return;
    }
    const off = isThinkingOff();
    button.textContent = off ? '思考：关' : '思考：开';
    button.style.background = off ? '#f3f4f6' : '#dcfce7';
    button.style.borderColor = off ? 'rgba(0,0,0,0.15)' : '#86efac';
    button.title = off
      ? '当前关闭思考：请求会注入 reasoning_effort=none。点击开启'
      : '当前开启思考。点击关闭';
  }

  function createButton() {
    button = document.createElement('button');
    button.id = BTN_ID;
    button.type = 'button';
    button.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'padding:4px 10px',
      'margin-right:8px',
      'border-radius:999px',
      'border:1px solid rgba(0,0,0,0.15)',
      'background:#fff',
      'cursor:pointer',
      'font-size:12px',
      'line-height:1.4',
      'color:#333',
      'white-space:nowrap',
      'box-shadow:0 1px 2px rgba(0,0,0,0.06)',
      'font-family:inherit'
    ].join(';');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setThinkingOff(!isThinkingOff());
      renderButton();
    });
    renderButton();
    return button;
  }

  // ---------- 3. 定位模型选择器并插入 ----------
  function findModelSelector() {
    const area = document.querySelector(INPUT_AREA_SELECTOR);
    if (!area) {
      return null;
    }
    const candidates = area.querySelectorAll('button, [role="button"], select');
    let best = null;
    for (const element of candidates) {
      if (element.id === BTN_ID || element.contains(button)) {
        continue;
      }
      const text = (element.textContent || '').trim();
      if (!text || !MODEL_TEXT_RE.test(text)) {
        continue;
      }
      // 取最内层的匹配元素，避免命中整个输入区容器
      if (!best || element.children.length < best.children.length) {
        best = element;
      }
    }
    return best;
  }

  function tryInsert() {
    if (document.getElementById(BTN_ID)) {
      return true;
    }
    const target = findModelSelector();
    if (!target || !target.parentElement) {
      return false;
    }
    const node = createButton();
    target.parentElement.insertBefore(node, target);
    return true;
  }

  // 兜底：找不到模型选择器时固定到右下角
  function insertFloating() {
    if (document.getElementById(BTN_ID)) {
      return;
    }
    const node = createButton();
    node.style.position = 'fixed';
    node.style.right = '18px';
    node.style.bottom = '18px';
    node.style.zIndex = '2147483647';
    node.style.padding = '8px 14px';
    node.style.fontSize = '13px';
    node.style.background = isThinkingOff() ? '#f3f4f6' : '#dcfce7';
    document.body.appendChild(node);
  }

  // ---------- 4. 启动与重插 ----------
  function start() {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      if (tryInsert()) {
        clearInterval(timer);
        watch();
        return;
      }
      if (attempts >= 40) {
        clearInterval(timer);
        insertFloating();
        watch();
      }
    }, 500);

    function watch() {
      const observer = new MutationObserver(function () {
        // 切换对话或重新渲染后，Svelte 可能移除节点，这里补回
        if (!document.getElementById(BTN_ID)) {
          if (!tryInsert()) {
            insertFloating();
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
