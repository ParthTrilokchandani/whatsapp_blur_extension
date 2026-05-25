// WhatsApp Privacy Shield - Popup Script v2.2
// Created by Agent P

const PRESETS = {
  contactNames:  'Contact Names',
  chatList:      'Chat List',
  profilePhotos: 'Profile Photos',
  messageText:   'Message Text',
  timestamps:    'Timestamps',
  lastMessage:   'Last Message Preview',
  unreadBadge:   'Unread Badges',
};

let currentTab = null;
let currentRules = [];

async function getWhatsAppTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, tabs => {
      resolve(tabs[0] || null);
    });
  });
}

async function sendToContent(msg) {
  if (!currentTab) return null;
  return new Promise(resolve => {
    chrome.tabs.sendMessage(currentTab.id, msg, response => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(response);
    });
  });
}

function renderRules(rules) {
  currentRules = rules || [];
  const list = document.getElementById('rules-list');
  const count = document.getElementById('rule-count');

  count.textContent = currentRules.length ? `(${currentRules.length})` : '';

  if (!currentRules.length) {
    list.innerHTML = '<div class="no-rules"><span class="icon">✨</span>No rules active yet</div>';
    return;
  }

  list.innerHTML = currentRules.map(rule => `
    <div class="rule-item">
      <span class="rule-badge ${rule.cssClass === 'wps-blur' ? 'blur' : 'hide'}">
        ${rule.cssClass === 'wps-blur' ? 'Blur' : 'Hide'}
      </span>
      <span class="rule-label" title="${rule.label}">${rule.label}</span>
      <button class="rule-remove" data-id="${rule.id}" title="Remove">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.rule-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resp = await sendToContent({ type: 'WPS_REMOVE_RULE', ruleId: btn.dataset.id });
      if (resp) renderRules(resp.rules);
    });
  });
}

function buildPresets() {
  const grid = document.getElementById('preset-grid');
  grid.innerHTML = Object.entries(PRESETS).map(([key, label]) => `
    <div class="preset-item">
      <div class="preset-label" title="${label}">${label}</div>
      <div class="preset-actions">
        <button class="preset-btn blur" data-key="${key}" data-mode="blur">Blur</button>
        <button class="preset-btn hide" data-key="${key}" data-mode="hide">Hide</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const resp = await sendToContent({
        type: 'WPS_APPLY_PRESET',
        key: btn.dataset.key,
        mode: btn.dataset.mode,
      });
      if (resp) renderRules(resp.rules);
    });
  });
}

async function init() {
  currentTab = await getWhatsAppTab();

  if (!currentTab) {
    document.getElementById('not-on-wa').style.display = 'block';
    return;
  }

  document.getElementById('main').style.display = 'block';
  buildPresets();

  // Load current rules
  const resp = await sendToContent({ type: 'WPS_GET_RULES' });
  renderRules(resp ? resp.rules : []);

  // Picker buttons
  document.getElementById('btn-pick-blur').addEventListener('click', async () => {
    await sendToContent({ type: 'WPS_START_PICKER', mode: 'blur' });
    window.close();
  });

  document.getElementById('btn-pick-hide').addEventListener('click', async () => {
    await sendToContent({ type: 'WPS_START_PICKER', mode: 'hide' });
    window.close();
  });

  // Clear all
  document.getElementById('btn-clear-all').addEventListener('click', async () => {
    if (!currentRules.length) return;
    if (!confirm('Remove all privacy rules?')) return;
    await sendToContent({ type: 'WPS_REMOVE_ALL' });
    renderRules([]);
  });
}

init();
