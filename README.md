# 🛡 WhatsApp Privacy Shield

<p align="center">
  <img src="penguin.png" alt="Agent P - WhatsApp Privacy Shield" width="480"/>
</p>

<p align="center">
  <b>Version 2.2</b> · Created by <b>Agent P</b><br/>
  Blur or hide any element on WhatsApp Web — hover to reveal instantly.
</p>

---

## ✨ Features

- **🎯 Element Picker** — Click any element on the page to blur or hide it
- **⚡ Quick Presets** — One-click privacy for common elements:
  - Contact Names
  - Chat List
  - Profile Photos
  - Message Text
  - Timestamps
  - Last Message Previews
  - Unread Badges
- **👁 Hover to Reveal** — Blurred/hidden elements show on mouse hover
- **💾 Persistent Rules** — Settings saved across browser sessions via Chrome storage
- **🗑 Easy Management** — View, remove individual rules, or clear all at once

---

## 🚀 Installation

### Option A: Load Unpacked (Developer Mode)

1. [Download the latest release](../../releases) or clone this repo:
   ```bash
   git clone https://github.com/your-username/whatsapp-privacy-shield.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked**
5. Select the `whatsapp-privacy-shield` folder (the one containing `manifest.json`)
6. Open [web.whatsapp.com](https://web.whatsapp.com) — the shield is active! 🎉

### ⚠️ Important: Don't Move the Folder

Once loaded, Chrome references the folder by its path. If you move it:
- Go to `chrome://extensions`
- Remove the old entry
- Click **Load unpacked** again and point to the new location

> **Best practice:** Keep the folder in a permanent location like `Documents/extensions/whatsapp-privacy-shield` or just clone from GitHub anytime you need it.

### Option B: Chrome Web Store *(coming soon)*

---

## 🎮 How to Use

### Using Presets
1. Click the extension icon in your Chrome toolbar
2. Under **Quick Presets**, click **Blur** or **Hide** next to any category
3. That element type is now blurred/hidden across all of WhatsApp Web
4. **Hover over any blurred/hidden element** to temporarily reveal it

### Using the Element Picker
1. Click the extension icon
2. Click **Blur it** or **Hide it** under "Pick any element"
3. The popup closes and a green picker bar appears at the top of the page
4. Hover over any element — it highlights in green
5. Click it to apply the blur/hide rule
6. The rule is saved automatically

### Managing Rules
- Open the extension popup to see all active rules
- Click **×** next to any rule to remove it
- Click **Clear All** to start fresh

---

## 📁 Project Structure

```
whatsapp-privacy-shield/
├── manifest.json       # Chrome extension manifest (MV3)
├── content.js          # Injected into WhatsApp Web — applies rules, picker logic
├── content.css         # Blur/hide styles injected into the page
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic — presets, rule management
├── icon16.png          # Extension icon 16×16
├── icon48.png          # Extension icon 48×48
├── icon128.png         # Extension icon 128×128
├── README.md           # This file
├── CHANGELOG.md        # Version history
├── LICENSE             # MIT License
└── .gitignore          # Git ignore rules
```

---

## 🔧 Technical Notes

- Built with **Manifest V3** (current Chrome extension standard)
- Uses WhatsApp's stable internal `_ak*` class names and `data-testid` attributes — avoids hashed Tailwind-style classes (e.g. `x1abc123`) that rotate with updates
- Rules stored in `chrome.storage.local` — survive browser restarts
- A debounced `MutationObserver` re-applies rules as WhatsApp's virtual list renders new rows
- Works on **any WhatsApp Web instance** worldwide (same codebase served globally)

### Will it break after WhatsApp updates?

WhatsApp's `_ak*` internal classes have been stable for years, but Meta can change them anytime. If a preset stops working, the fix is updating a few selectors in `content.js`. The **element picker always works** regardless — it reads your live DOM directly.

---

## 🔒 Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your blur/hide rules across sessions |
| `activeTab` | Communicate with the WhatsApp Web tab |
| `host_permissions: web.whatsapp.com` | Inject the content script into WhatsApp Web only |

The extension **never** reads your messages, contacts, or any WhatsApp data. It only adds and removes CSS classes on DOM elements.

---

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

[MIT License](LICENSE) — free to use, modify, and distribute.

---

<p align="center">
  Made with 🐧 by <b>Agent P</b> · v2.2
</p>
