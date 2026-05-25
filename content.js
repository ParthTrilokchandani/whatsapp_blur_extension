// WhatsApp Privacy Shield - Content Script v2.2
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
  // Selectors derived from live WhatsApp Web DOM inspection (May 2026).
  // WhatsApp now uses data-testid attributes as the stable anchors alongside
  // rotating Tailwind-style classes (x1abc123). We target data-testid.
  const PRESETS = {
    contactNames: {
      label: 'Contact Names',
      selectors: [
        '[data-testid="cell-frame-title"] span[dir="auto"]',
        '[data-testid="cell-frame-title"] span[title]',
        '[data-testid="conversation-info-header-chat-title"] span',
        'header [data-testid="conversation-header"] span[dir]',
      ]
    },
    chatList: {
      label: 'Chat List',
      selectors: [
        '[data-testid="chat-list"]',
        '#pane-side',
      ]
    },
    profilePhotos: {
      label: 'Profile Photos',
      selectors: [
        '[data-testid="cell-frame-container"] img',
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
        '[data-testid="cell-frame-primary-detail"] span',
        '[data-testid="msg-meta"]',
        'span[data-testid="msg-meta"]',
      ]
    },
    lastMessage: {
      label: 'Last Message Preview',
      selectors: [
        '[data-testid="last-msg-status"] span[dir="ltr"]',
        '[data-testid="last-msg-status"] span[dir="auto"]',
        '[data-testid="cell-frame-secondary"] span[dir]',
        '[data-testid="cell-frame-secondary"]',
      ]
    },
    unreadBadge: {
      label: 'Unread Badges',
      selectors: [
        '[data-testid="icon-unread-count"]',
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

    // Overlay owns all events — WhatsApp's handlers never see the click.
    // Bar is a child of overlay so there is no z-index race between them.
    const overlay = document.createElement('div');
    overlay.id = 'wps-pick-overlay';

    const bar = document.createElement('div');
    bar.id = 'wps-picker-bar';
    bar.innerHTML = `
      <span>🎯 ${mode === 'blur' ? 'Blur' : 'Hide'} Picker — </span>
      click any element to ${mode} it
      <button class="cancel" id="wps-cancel-pick">✕ Cancel</button>
    `;
    overlay.appendChild(bar);
    document.body.appendChild(overlay);

    document.getElementById('wps-cancel-pick').addEventListener('click', (e) => {
      e.stopPropagation();
      stopPicker();
    });

    function whatsappElAt(x, y) {
      overlay.style.pointerEvents = 'none';
      const el = document.elementFromPoint(x, y);
      overlay.style.pointerEvents = 'auto';
      return (el && el !== overlay && !el.closest('#wps-picker-bar') && !el.closest('#wps-pick-overlay > *:not(#wps-picker-bar)')) ? el : null;
    }

    overlay.addEventListener('mousemove', (e) => {
      if (e.target.closest('#wps-picker-bar')) return;
      overlay.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';
      if (!under || under === overlay) return;
      if (state.hoverEl && state.hoverEl !== under) {
        state.hoverEl.classList.remove('wps-highlight-hover');
      }
      state.hoverEl = under;
      under.classList.add('wps-highlight-hover');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target.closest('#wps-picker-bar')) return;

      overlay.style.pointerEvents = 'none';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = 'auto';

      if (!under || under === overlay) return;

      if (state.hoverEl) {
        state.hoverEl.classList.remove('wps-highlight-hover');
        state.hoverEl = null;
      }

      const selector = buildSelector(under);
      const cssClass = state.pickMode === 'blur' ? 'wps-blur' : 'wps-hide';
      const pickerMode = state.pickMode;

      const rule = {
        id: uid(),
        selector,
        selectors: [selector],
        cssClass,
        label: `Custom (${under.dataset.testid || under.tagName.toLowerCase()})`,
        custom: true,
      };

      state.rules.push(rule);
      applyRule(rule);
      saveRules();
      stopPicker();
      showToast(`✅ Element will ${pickerMode === 'blur' ? 'blur' : 'hide'} — hover to reveal`);
      notifyPopup();
    });
  }

  function stopPicker() {
    state.pickMode = null;
    document.body.classList.remove('wps-picking-mode');
    if (state.hoverEl) {
      state.hoverEl.classList.remove('wps-highlight-hover');
      state.hoverEl = null;
    }
    const overlay = document.getElementById('wps-pick-overlay');
    if (overlay) overlay.remove();
    const bar = document.getElementById('wps-picker-bar');
    if (bar) bar.remove();
  }

  // ── Selector builder ──────────────────────────────────────────────────────

  // Normalizes WhatsApp testids that carry a dynamic numeric index so the
  // resulting selector matches all rows, not just the one that was clicked.
  // e.g. "list-item-0" → [data-testid^="list-item-"]
  function testidSelector(testid) {
    const normalized = testid.replace(/-\d+$/, '-');
    if (normalized !== testid) return `[data-testid^="${normalized}"]`;
    return `[data-testid="${testid}"]`;
  }

  function buildSelector(el) {
    // 1. Stable testid on the element itself
    if (el.dataset.testid) return testidSelector(el.dataset.testid);

    // 2. Walk up to 10 levels to find a stable testid ancestor.
    //    Skip purely-dynamic ones (list-item-N) in favour of deeper stable ones.
    let best = null;
    let ancestor = el.parentElement;
    for (let i = 0; i < 10 && ancestor && ancestor !== document.body; i++) {
      if (ancestor.dataset.testid) {
        const tid = ancestor.dataset.testid;
        // Prefer stable testids (no numeric suffix) when possible
        if (!/-\d+$/.test(tid)) {
          const tag = el.tagName.toLowerCase();
          return `${testidSelector(tid)} ${tag}`;
        }
        if (!best) best = { tid, tag: el.tagName.toLowerCase() };
      }
      ancestor = ancestor.parentElement;
    }
    if (best) return `${testidSelector(best.tid)} ${best.tag}`;

    // 3. aria-label on element
    if (el.getAttribute('aria-label')) {
      return `[aria-label="${el.getAttribute('aria-label')}"]`;
    }

    // 4. tag + role
    if (el.getAttribute('role')) {
      return `${el.tagName.toLowerCase()}[role="${el.getAttribute('role')}"]`;
    }

    // 5. tag + stable class fragments (skip hashed x0-9 and _ao3e-style classes)
    const stableClasses = [...el.classList]
      .filter(c => !c.startsWith('wps-') && !/^x[0-9]/.test(c) && !/^_/.test(c))
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
