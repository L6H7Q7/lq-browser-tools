// ==UserScript==
// @name         llama-ui 对话多选删除
// @namespace    https://github.com/L6H7Q7
// @version      1.0.0
// @description  给 llama.cpp 网页（127.0.0.1:8080）的对话列表增加多选批量删除
// @match        http://127.0.0.1:8080/*
// @match        http://localhost:8080/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const ROW_SELECTOR = '[data-conversation-row]';
  const DB_NAME = 'LlamaUi';
  const TAB_KEY = 'LlamaUi.conversationTabs';

  let bar;
  let toggleBtn;
  let deleteBtn;
  let cancelBtn;
  let selecting = false;
  let busy = false;
  let paintScheduled = false;
  const selected = new Set();

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function rows() {
    return Array.from(document.querySelectorAll(ROW_SELECTOR));
  }

  function rowId(row) {
    return row.getAttribute('data-conversation-row');
  }

  function paint() {
    for (const row of rows()) {
      if (selecting && selected.has(rowId(row))) {
        row.style.outline = '2px solid #6750A4';
        row.style.outlineOffset = '-2px';
        row.style.background = 'rgba(103, 80, 164, 0.16)';
      } else {
        row.style.outline = '';
        row.style.outlineOffset = '';
        row.style.background = '';
      }
    }

    if (toggleBtn) {
      toggleBtn.textContent = selecting ? '多选中（点对话勾选）' : '多选删除';
    }
    if (deleteBtn) {
      deleteBtn.style.display = selecting ? '' : 'none';
      deleteBtn.textContent = '删除选中 (' + selected.size + ')';
      deleteBtn.disabled = selected.size === 0 || busy;
    }
    if (cancelBtn) {
      cancelBtn.style.display = selecting ? '' : 'none';
    }
  }

  function schedulePaint() {
    if (paintScheduled) {
      return;
    }

    paintScheduled = true;
    setTimeout(() => {
      paintScheduled = false;
      paint();
    }, 120);
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
        // 标签列表格式异常时忽略，不影响对话删除
      }

      location.reload();
    } catch (error) {
      busy = false;
      paint();
      alert('删除失败：' + (error && error.message ? error.message : error));
    }
  }

  function buttonStyle(background, color) {
    return [
      'padding:6px 10px',
      'border-radius:8px',
      'border:1px solid rgba(0,0,0,0.15)',
      'background:' + background,
      'color:' + color,
      'cursor:pointer',
      'box-shadow:0 2px 6px rgba(0,0,0,0.18)',
      'font:13px/1.4 "Microsoft YaHei", sans-serif',
    ].join(';');
  }

  function ensureBar() {
    if (bar || !document.body) {
      return;
    }

    bar = document.createElement('div');
    bar.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:8px;align-items:center;';

    toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = '多选删除';
    toggleBtn.style.cssText = buttonStyle('#6750A4', '#ffffff');
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
    deleteBtn.textContent = '删除选中 (0)';
    deleteBtn.style.cssText = buttonStyle('#B3261E', '#ffffff');
    deleteBtn.style.display = 'none';
    deleteBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteSelected();
    });

    cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = buttonStyle('#ffffff', '#1D1B20');
    cancelBtn.style.display = 'none';
    cancelBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      exitSelecting();
    });

    bar.append(toggleBtn, deleteBtn, cancelBtn);
    document.body.appendChild(bar);
  }

  document.addEventListener(
    'click',
    (event) => {
      if (!selecting) {
        return;
      }

      const row = event.target.closest(ROW_SELECTOR);
      if (!row) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const id = rowId(row);
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

  function start() {
    ensureBar();
    const observer = new MutationObserver(schedulePaint);
    observer.observe(document.body, { childList: true, subtree: true });
    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
