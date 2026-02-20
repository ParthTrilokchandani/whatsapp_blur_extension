# Contributing to WhatsApp Privacy Shield

Thanks for your interest in contributing! Here's how to get started.

## Reporting Bugs

If a preset has stopped working (usually because WhatsApp updated their DOM):

1. Open [web.whatsapp.com](https://web.whatsapp.com)
2. Press `F12` to open DevTools
3. Inspect the element that should be targeted
4. Look for a `data-testid` attribute on it or a nearby ancestor
5. [Open an issue](../../issues/new) with:
   - Which preset is broken
   - The `data-testid` or structural selector you found
   - Your Chrome version

## Fixing Selectors

All preset selectors live in `content.js` in the `PRESETS` object:

```js
const PRESETS = {
  contactNames: {
    label: 'Contact Names',
    selectors: [
      '[data-testid="cell-frame-title"] span',
      // add additional fallback selectors here
    ]
  },
  // ...
};
```

Each preset accepts an array of selectors — all of them are applied, so you can add fallbacks without breaking existing rules.

## Adding a New Preset

1. Add an entry to `PRESETS` in `content.js`
2. Add the same key and label to the `PRESETS` object in `popup.js`
3. Test it on WhatsApp Web
4. Open a PR with a description of what the preset targets

## Code Style

- Plain vanilla JS (no build step required)
- Keep selectors in `content.js`, UI logic in `popup.js`
- Comment non-obvious selector choices with why they were chosen
- Use `data-testid` attributes wherever possible — they're the most stable

## Testing

Load the extension unpacked (see README) and manually test:
- Each preset in blur and hide mode
- The element picker on different element types
- Rule persistence after closing and reopening the browser
- Rule removal (individual and clear all)
