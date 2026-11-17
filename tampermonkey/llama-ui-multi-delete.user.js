// ==UserScript==
// @name         llama-ui 对话多选删除
// @namespace    https://github.com/L6H7Q7
// @version      1.3.0
// @description  给 llama.cpp 网页（127.0.0.1:8080）的侧边栏增加「多选」菜单，可批量删除对话
// @match        http://127.0.0.1:8080/*
// @match        http://localhost:8080/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const ROW_SELECTOR = '[data-conversation-row]';
  const ROW_MARKER = 'data-lq-multi-row';
  const DB_NAME = 'LlamaUi';
  const TAB_KEY = 'LlamaUi.conversationTabs';

  let row;
  let toggleBtn;
  let deleteBtn;
  let selectAllInput;
  let selecting = false;
  let busy = false;
  const selected = new Set();

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllConversationIds() {
    const db = await openDb();
    const keys = await new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const request = tx.objectStore('conversations').getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return keys;
  }

  function rows() {
    return Array.from(document.querySelectorAll(ROW_SELECTOR));
  }

  function rowId(rowElement) {
    return rowElement.getAttribute('data-conversation-row');
  }

  function findSettingsButton() {
    return Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent.trim().startsWith('Settings')
    );
  }

  function setButtonText(button, text) {
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim().length > 0) {
        node.textContent = text;
        return;
      }
    }
    button.appendChild(document.createTextNode(text));
  }

  function ensureStyle() {
    if (document.getElementById('lq-multi-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'lq-multi-style';
    // 页面会反复重写对话行的 style/class，所以选中态用自定义属性 + CSS 规则
    style.textContent =
      "[data-conversation-row][data-lq-selected='1']{outline:2px solid #6750A4!important;outline-offset:-2px!important;background:rgba(103,80,164,0.16)!important;}";
    document.head.appendChild(style);
  }

  function paint() {
    for (const rowElement of rows()) {
      if (selecting && selected.has(rowId(rowElement))) {
        rowElement.setAttribute('data-lq-selected', '1');
      } else {
        rowElement.removeAttribute('data-lq-selected');
      }
    }

    if (toggleBtn) {
      setButtonText(toggleBtn, selecting ? '退出多选' : '多选');
    }
    if (deleteBtn) {
      deleteBtn.style.display = selecting ? '' : 'none';
      deleteBtn.textContent = '删除 (' + selected.size + ')';
      deleteBtn.disabled = selected.size === 0 || busy;
    }
    if (selectAllInput) {
      const box = selectAllInput.closest('[data-lq-select-all]');
      if (box) {
        box.style.display = selecting ? 'flex' : 'none';
        const domRows = rows();
        const allVisibleSelected = domRows.length > 0 && domRows.every((item) => selected.has(rowId(item)));
        selectAllInput.checked = selecting && selected.size > 0 && allVisibleSelected;
        selectAllInput.indeterminate = selecting && selected.size > 0 && !allVisibleSelected;
      }
    }
  }

  function enterSelecting() {
    selecting = true;
    selected.clear();
    paint();
  }

  function exitSelecting() {
    selecting = false;
    selected.clear();
    paint();
  }

  function injectRow() {
    if (document.querySelector('[' + ROW_MARKER + ']')) {
      return;
    }

    const settings = findSettingsButton();
    if (!settings || !settings.parentElement || !settings.parentElement.parentElement) {
      return;
    }

    const wrap = settings.parentElement;
    const container = wrap.parentElement;

    row = document.createElement('div');
    row.setAttribute(ROW_MARKER, '1');
    row.style.cssText = 'display:flex;align-items:center;gap:6px;width:100%;min-width:0;';

    toggleBtn = settings.cloneNode(true);
    toggleBtn.style.flex = '1 1 auto';
    toggleBtn.style.minWidth = '0';
    toggleBtn.style.width = 'auto';
    const svg = toggleBtn.querySelector('svg');
    if (svg) {
      svg.outerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>';
    }
    setButtonText(toggleBtn, '多选');
    toggleBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (selecting) {
        exitSelecting();
      } else {
        enterSelecting();
      }
    });

    deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = '删除 (0)';
    deleteBtn.style.cssText =
      'padding:4px 8px;border-radius:6px;border:1px solid #d66;background:#fff;color:#b3261e;font:12px/1.4 "Microsoft YaHei",sans-serif;cursor:pointer;display:none;white-space:nowrap;flex-shrink:0;margin-left:auto;';
    deleteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteSelected();
    });

    row.append(toggleBtn, deleteBtn);
    container.insertBefore(row, wrap.nextSibling);
  }

  function findRecentLabel() {
    const existing = document.querySelector('[data-lq-select-all]');
    if (existing && existing.parentElement) {
      return existing.parentElement;
    }

    return Array.from(document.querySelectorAll('div')).find(
      (element) =>
        element.textContent.trim().startsWith('Recent conversations') &&
        !element.querySelector(ROW_SELECTOR) &&
        element.children.length <= 1
    );
  }

  function injectSelectAll() {
    const label = findRecentLabel();
    if (!label) {
      selectAllInput = null;
      return;
    }

    const existing = label.querySelector('[data-lq-select-all]');
    if (existing) {
      const input = existing.querySelector('input');
      if (input) {
        selectAllInput = input;
      }
      return;
    }

    const box = document.createElement('label');
    box.setAttribute('data-lq-select-all', '1');
    box.style.cssText =
      'display:none;margin-left:auto;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#6750A4;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.style.cssText = 'width:13px;height:13px;accent-color:#6750A4;cursor:pointer;';
    const text = document.createElement('span');
    text.textContent = '全选';
    box.append(input, text);

    input.addEventListener('change', async (event) => {
      if (event.target.checked) {
        try {
          const ids = await getAllConversationIds();
          selected.clear();
          for (const id of ids) {
            selected.add(String(id));
          }
        } catch (error) {
          selected.clear();
        }
      } else {
        selected.clear();
      }
      paint();
    });

    label.appendChild(box);
    selectAllInput = input;
  }

  async function deleteSelected() {
    if (busy || selected.size === 0) {
      return;
    }

    const ids = Array.from(selected);
    if (!confirm('确定删除选中的 ' + ids.length + ' 个对话吗？此操作不可撤销。')) {
      return;
    }

    busy = true;
    paint();
    try {
      const db = await openDb();
      const messageKeys = [];
      await new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const index = tx.objectStore('messages').index('convId');
        for (const id of ids) {
          const request = index.getAllKeys(id);
          request.onsuccess = () => messageKeys.push.apply(messageKeys, request.result);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      await new Promise((resolve, reject) => {
        const tx = db.transaction(['conversations', 'messages'], 'readwrite');
        const conversations = tx.objectStore('conversations');
        const messages = tx.objectStore('messages');
        for (const id of ids) {
          conversations.delete(id);
        }
        for (const key of messageKeys) {
          messages.delete(key);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();

      try {
        const tabs = JSON.parse(localStorage.getItem(TAB_KEY) || '[]');
        const kept = Array.isArray(tabs) ? tabs.filter((tab) => ids.indexOf(tab) === -1) : tabs;
        localStorage.setItem(TAB_KEY, JSON.stringify(kept));
      } catch (error) {
        // 标签列表格式异常时忽略
      }

      location.reload();
    } catch (error) {
      busy = false;
      paint();
      alert('删除失败：' + (error && error.message ? error.message : error));
    }
  }

  document.addEventListener(
    'click',
    (event) => {
      if (!selecting) {
        return;
      }

      const rowElement = event.target.closest(ROW_SELECTOR);
      if (!rowElement) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const id = rowId(rowElement);
      if (!id) {
        return;
      }

      if (selected.has(id)) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      paint();
    },
    true
  );

  function tick() {
    if (row && !document.body.contains(row)) {
      row = null;
      toggleBtn = null;
      deleteBtn = null;
    }
    ensureStyle();
    injectRow();
    injectSelectAll();
    paint();
  }

  setInterval(tick, 400);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tick);
  } else {
    tick();
  }
})();
