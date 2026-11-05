// -----------------------------------------------------------------------------
// Applies the user's theme to the current page. "light" and "dark" force that
// look; "auto" removes the override so the page follows Firefox. The colors
// themselves live in the CSS (light-dark() pairs, see grid/grid.css).
// -----------------------------------------------------------------------------
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme;
}
