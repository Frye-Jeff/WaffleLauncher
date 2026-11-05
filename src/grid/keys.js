// -----------------------------------------------------------------------------
// Keyboard rules for the app grid, as a pure function so they can be unit
// tested without a browser.
//
//   Arrow keys, Home, End          move focus between tiles
//   Ctrl + those keys              move the focused tile (reorder)
//   Option + those keys (Mac only) same as Ctrl; on macOS Ctrl+Left/Right
//                                  usually switches desktops instead
// -----------------------------------------------------------------------------

// Returns what a key press should do on the tile at `index`, in a grid of
// `count` tiles laid out in `columns` columns:
//   { type: "focus", to }  move focus to tile `to`
//   { type: "move", to }   move the focused tile to position `to`
//   null                   not a grid key, or nowhere to go (let it through)
// `event` needs { key, ctrlKey, altKey, metaKey, shiftKey }.
export function gridKeyAction(event, index, count, columns, isMac = false) {
  const { key, ctrlKey, altKey, metaKey, shiftKey } = event;
  if (metaKey || shiftKey || count < 1 || index < 0 || index >= count) return null;

  const moveModifier = ctrlKey || (isMac && altKey);
  if (ctrlKey && altKey) return null;   // not one of ours
  if (altKey && !isMac) return null;    // Alt+arrows is Back/Forward on Windows/Linux

  const lastRow = Math.floor((count - 1) / columns);
  const row = Math.floor(index / columns);
  let to;
  switch (key) {
    case "ArrowLeft":
      to = index - 1;
      break;
    case "ArrowRight":
      to = index + 1;
      break;
    case "ArrowUp":
      to = index - columns;
      break;
    case "ArrowDown":
      // From a full row onto a shorter last row, land on its last tile.
      to = row < lastRow ? Math.min(index + columns, count - 1) : count;
      break;
    case "Home":
      to = 0;
      break;
    case "End":
      to = count - 1;
      break;
    default:
      return null;
  }
  if (to < 0 || to >= count || to === index) return null;
  return { type: moveModifier ? "move" : "focus", to };
}
