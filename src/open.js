// -----------------------------------------------------------------------------
// Rules for how a click opens an app, as pure functions so they can be unit
// tested without a browser.
//
//   Normal click or Enter           the user's setting ("new-tab" or "smart"),
//                                   then the popup closes
//   Ctrl-click (Cmd on Mac),
//   middle-click, Ctrl+Enter        a background tab; the popup stays open
// -----------------------------------------------------------------------------

// Firefox's own new-tab and blank pages, which "smart" may replace.
const BLANK_TAB_URLS = new Set([
  "about:newtab",
  "about:home",
  "about:blank",
  "about:privatebrowsing",
]);

// Returns "background" for a background-tab click, otherwise "normal".
// `event` needs { button, ctrlKey, metaKey }. On Mac, Ctrl-click is a
// right-click, so Cmd is the modifier there.
export function clickKind(event, isMac = false) {
  if (event.button === 1) return "background";
  const modifier = isMac ? event.metaKey : event.ctrlKey;
  return modifier ? "background" : "normal";
}

// True if `url` is a new or blank tab that "smart" can reuse.
export function isBlankTabUrl(url) {
  return typeof url === "string" && BLANK_TAB_URLS.has(url.split("#")[0]);
}

// Decides where a normal click opens the app, given the setting and the
// active tab's URL (undefined if Firefox didn't share it):
//   "current"  replace the active tab
//   "new"      open a new tab
export function normalClickTarget(mode, activeTabUrl) {
  return mode === "smart" && isBlankTabUrl(activeTabUrl) ? "current" : "new";
}
