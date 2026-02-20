# Changelog

All notable changes to **WhatsApp Privacy Shield** are documented here.

---

## [2.1.0] - 2026-02-20

### Added
- **Unread Badges** preset — hide unread message counts
- **Last Message Preview** preset — hide chat preview text in the sidebar
- Multi-selector support for presets (multiple CSS selectors per rule for better coverage)
- Improved custom element picker with smarter selector generation
  - Prioritises `data-testid` attributes (stable across WhatsApp updates)
  - Falls back through `aria-label`, `role`, and structural selectors
  - Avoids hashed class names (e.g. `x1abc123`) that rotate frequently
- Hover-to-reveal now also triggers when hovering a parent element
- Version and author info displayed in popup header

### Fixed
- Chat List, Profile Photos, Message Text, Timestamps presets now correctly target elements using stable `data-testid` selectors
- Rules now persist correctly after browser restart for multi-selector presets
- Picker bar no longer interferes with element selection

### Changed
- Status Badges preset replaced with Unread Badges (more reliable selector)
- Chat Previews renamed to Last Message Preview for clarity
- Extension version bumped to `2.1.0` in manifest

---

## [1.0.0] - 2026-02-19

### Added
- Initial release
- Blur and Hide modes with hover-to-reveal
- Element picker tool
- 7 quick presets: Contact Names, Chat List, Profile Photos, Message Text, Timestamps, Status Badges, Chat Previews
- Persistent rules via `chrome.storage.local`
- MutationObserver for SPA re-application
- Active rules management panel in popup
