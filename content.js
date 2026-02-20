// WhatsApp Privacy Shield - Content Script v2.1
// Created by Agent P

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let state = {
    rules: [],       // [{id, selector, cssClass, label}]
    pickMode: null,  // 'blur' | 'hide' | null
    hoverEl: null,
  };

  // ── Predefined quick targets ───────────────────────────────────────────────
  // Selectors derived from live WhatsApp Web DOM inspection (Feb 2026).
  // WhatsApp uses stable internal classes (_ak8q, _ak8n etc.) alongside
  // rotating Tailwind-style ones (x1abc123). We target the stable _ak* ones.
  const PRESETS = {
    contactNames: {
      label: 'Contact Names',
      selectors: [
        '._ak8q span[dir="auto"][title]',
        '._ak8q span[title]',
        '[data-testid="conversation-info-header-chat-title"] span',
        'header ._amid span[dir]',
      ]
    },
    chatList: {
      label: 'Chat List',
      selectors: [
        '[data-testid="chat-list"]',
        '#pane-side',
        '._ak_3',
      ]
    },
    profilePhotos: {
      label: 'Profile Photos',
      selectors: [
        '._ak8h img',
        'img[src*="cdn.whatsapp.net"]',
        'img[src*="whatsapp.net"]',
        '[data-testid="conversation-info-header"] img',
      ]
    },
    messageText: {
      label: 'Message Text',
      selectors: [
        '[data-testid="msg-container"] span[dir="ltr"]',
        '[data-testid="msg-container"] span[dir="rtl"]',
        '.selectable-text span[dir]',
        '[class*="copyable-text"] span[dir]',
      ]
    },
    timestamps: {
      label: 'Timestamps',
      selectors: [
        '._ak8i span[style*="--x-fontSize"]',
        '[data-testid="msg-meta"]',
        'span[data-testid="msg-meta"]',
      ]
    },
    lastMessage: {
      label: 'Last Message Preview',
      selectors: [
        '._ak8k span[dir="ltr"]',
        '._ak8k span[dir="auto"]',
        '._ak8k span[aria-label]',
        '._ak8k',
      ]
    },
    unreadBadge: {
      label: 'Unread Badges',
      selectors: [
        '[data-testid="icon-unread-count"]',
        '._ahlv',
        '[aria-label*="nread"]',
      ]
    },
  };

  // ── ID generator ──────────────────────────────────────────────────────────
  let _idCounter = 0;
  function uid() { return 'wps_' + (++_idCounter) + '_' + Date.now(); }

  // ── Apply / remove rules ──────────────────────────────────────────────────
  function applyRule(rule) {
    const selectors = rule.selectors || [rule.selector];
    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          el.classList.add(rule.cssClass);
          el.dataset.wpsId = rule.id;
        });
      } catch(e) { /* ignore bad selectors */ }
    });
  }

  function removeRule(ruleId) {
    document.querySelectorAll(`[data-wps-id="${ruleId}"]`).forEach(el => {
      el.classList.remove('wps-blur', 'wps-hide');
      delete el.dataset.wpsId;
    });
  }

  function applyAllRules() {
    observer.disconnect();           // pause to avoid reacting to our own changes
    state.rules.forEach(applyRule);
    observer.observe(document.body, observerConfig);
  }

  // Debounced re-apply — WhatsApp's virtual list swaps rows constantly
  let _applyTimer;
  function scheduleApply() {
    clearTimeout(_applyTimer);
    _applyTimer = setTimeout(applyAllRules, 80);
  }

  const observerConfig = { childList: true, subtree: true };
  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, observerConfig);

  // ── Persistence ───────────────────────────────────────────────────────────
  function saveRules() {
    chrome.storage.local.set({ wpsRules: state.rules });
  }

  function loadRules() {
    chrome.storage.local.get('wpsRules', ({ wpsRules }) => {
      if (wpsRules && wpsRules.length) {
        state.rules = wpsRules;
        applyAllRules();
      }
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    let toast = document.getElementById('wps-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wps-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── Picker mode ───────────────────────────────────────────────────────────
  function startPicker(mode) {
    state.pickMode = mode;
    document.body.classList.add('wps-picking-mode');

    // Picker bar
    const bar = document.createElement('div');
    bar.id = 'wps-picker-bar';
    bar.innerHTML = `
      <span>🎯 ${mode === 'blur' ? 'Blur' : 'Hide'} Picker</span>
      Click any element on the page to ${mode} it. Hover to preview.
      <button class="cancel" id="wps-cancel-pick">✕ Cancel</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('wps-cancel-pick').onclick = stopPicker;
  }

  function stopPicker() {
    state.pickMode = null;
    document.body.classList.remove('wps-picking-mode');
    if (state.hoverEl) {
      state.hoverEl.classList.remove('wps-highlight-hover');
      state.hoverEl = null;
    }
    const bar = document.getElementById('wps-picker-bar');
    if (bar) bar.remove();
  }

  // ── Mouse events for picker ───────────────────────────────────────────────
  document.addEventListener('mouseover', (e) => {
    if (!state.pickMode) return;
    if (e.target.closest('#wps-picker-bar')) return;

    if (state.hoverEl && state.hoverEl !== e.target) {
      state.hoverEl.classList.remove('wps-highlight-hover');
    }
    state.hoverEl = e.target;
    e.target.classList.add('wps-highlight-hover');
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!state.pickMode) return;
    e.target.classList.remove('wps-highlight-hover');
  }, true);

  document.addEventListener('click', (e) => {
    if (!state.pickMode) return;
    if (e.target.closest('#wps-picker-bar')) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    el.classList.remove('wps-highlight-hover');

    // Build a decent selector
    const selector = buildSelector(el);
    const cssClass = state.pickMode === 'blur' ? 'wps-blur' : 'wps-hide';
    const mode = state.pickMode;

    const rule = {
      id: uid(),
      selector,
      selectors: [selector],
      cssClass,
      label: `Custom (${el.dataset.testid || el.tagName.toLowerCase()})`,
      custom: true,
    };

    state.rules.push(rule);
    applyRule(rule);
    saveRules();
    stopPicker();
    showToast(`✅ Element will ${mode === 'blur' ? 'blur' : 'hide'} — hover to reveal`);
    notifyPopup();
  }, true);

  // ── Selector builder ──────────────────────────────────────────────────────
  function buildSelector(el) {
    // 1. data-testid on element itself
    if (el.dataset.testid) return `[data-testid="${el.dataset.testid}"]`;

    // 2. Walk up to find a testid ancestor and use it with child tag
    let ancestor = el.parentElement;
    for (let i = 0; i < 4 && ancestor && ancestor !== document.body; i++) {
      if (ancestor.dataset.testid) {
        const tag = el.tagName.toLowerCase();
        return `[data-testid="${ancestor.dataset.testid}"] ${tag}`;
      }
      ancestor = ancestor.parentElement;
    }

    // 3. aria-label
    if (el.getAttribute('aria-label')) {
      return `[aria-label="${el.getAttribute('aria-label')}"]`;
    }

    // 4. tag + role
    if (el.getAttribute('role')) {
      return `${el.tagName.toLowerCase()}[role="${el.getAttribute('role')}"]`;
    }

    // 5. tag + stable class fragments (avoid hashed ones like x1abc123)
    const stableClasses = [...el.classList]
      .filter(c => !c.startsWith('wps-') && !/^x[0-9]/.test(c))
      .slice(0, 2);

    let sel = el.tagName.toLowerCase();
    if (stableClasses.length) sel += '.' + stableClasses.join('.');

    return sel;
  }

  // ── Message bridge with popup ─────────────────────────────────────────────
  function notifyPopup() {
    chrome.runtime.sendMessage({ type: 'WPS_RULES_UPDATED', rules: state.rules }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {

      case 'WPS_GET_RULES':
        sendResponse({ rules: state.rules });
        break;

      case 'WPS_START_PICKER':
        startPicker(msg.mode);
        sendResponse({ ok: true });
        break;

      case 'WPS_APPLY_PRESET': {
        const preset = PRESETS[msg.key];
        if (!preset) break;
        const cssClass = msg.mode === 'blur' ? 'wps-blur' : 'wps-hide';
        // Remove existing rule for same preset
        state.rules = state.rules.filter(r => r.presetKey !== msg.key);
        const rule = {
          id: uid(),
          selectors: preset.selectors,
          selector: preset.selectors[0], // fallback
          cssClass,
          label: preset.label,
          presetKey: msg.key,
        };
        state.rules.push(rule);
        applyRule(rule);
        saveRules();
        showToast(`✅ ${preset.label}: ${msg.mode}`);
        sendResponse({ ok: true, rules: state.rules });
        break;
      }

      case 'WPS_REMOVE_RULE': {
        removeRule(msg.ruleId);
        state.rules = state.rules.filter(r => r.id !== msg.ruleId);
        saveRules();
        sendResponse({ ok: true, rules: state.rules });
        break;
      }

      case 'WPS_REMOVE_ALL': {
        state.rules.forEach(r => removeRule(r.id));
        state.rules = [];
        saveRules();
        showToast('🗑 All rules cleared');
        sendResponse({ ok: true });
        break;
      }
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  loadRules();
  showToast('🛡 WhatsApp Privacy Shield active');

})();
