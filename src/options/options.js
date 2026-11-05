// -----------------------------------------------------------------------------
// Options page: choose which apps appear (checkboxes grouped by service), their
// order (drag in the grid preview), how apps open, and the theme. Every change
// saves immediately.
// -----------------------------------------------------------------------------
import { APPS, GRID_SIZE } from "../apps.js";
import { catalog } from "../catalog.js";
import {
  loadAppIds,
  loadOpenMode,
  loadTheme,
  moveItem,
  onAppIdsChanged,
  onOpenModeChanged,
  onThemeChanged,
  resetSettings,
  saveAppIds,
  saveOpenMode,
  saveTheme,
} from "../settings.js";
import {
  IS_MAC,
  MOVE_KEY_LABEL,
  createTile,
  enableDragReorder,
  enableKeyboardReorder,
  syncGrid,
} from "../grid/grid.js";
import { applyTheme } from "../theme.js";

const APP_BY_ID = new Map(APPS.map((app) => [app.id, app]));
const STATUS_MS = 2000;

const grid = document.getElementById("grid");
const count = document.getElementById("count");
const limitHint = document.getElementById("limit-hint");
const orderHint = document.getElementById("order-hint");
const fullNote = document.getElementById("full-note");
const services = document.getElementById("services");
const restore = document.getElementById("restore");
const status = document.getElementById("status");
const backgroundNote = document.getElementById("background-note");

const checkboxes = new Map(); // app id -> <input type="checkbox">
let appIds = [];
let statusTimer;

// --- Drawing ----------------------------------------------------------------
function buildPickerItem(app) {
  const item = document.createElement("li");

  const label = document.createElement("label");
  label.className = "picker-item";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = app.id;
  input.addEventListener("change", () => toggleApp(app.id, input.checked));
  checkboxes.set(app.id, input);

  const icon = document.createElement("img");
  icon.className = "picker-icon";
  icon.src = browser.runtime.getURL(app.icon);
  icon.alt = "";

  const name = document.createElement("span");
  name.textContent = app.name;

  label.append(input, icon, name);
  item.append(label);
  return item;
}

// One heading per service, then one alphabetized list per group.
function buildPicker() {
  for (const service of catalog()) {
    const heading = document.createElement("h3");
    heading.textContent = service.name;
    services.append(heading);

    for (const section of service.sections) {
      if (section.name) {
        const subheading = document.createElement("h4");
        subheading.textContent = section.name;
        services.append(subheading);
      }
      const list = document.createElement("ul");
      list.className = "picker";
      list.setAttribute("aria-label",
        section.name ? `${service.name}: ${section.name}` : `${service.name} apps`);
      list.append(...section.apps.map(buildPickerItem));
      services.append(list);
    }
  }
}

function render(ids) {
  appIds = ids.filter((id) => APP_BY_ID.has(id));

  grid.replaceChildren(
    ...appIds.map((id, index) => createTile(APP_BY_ID.get(id), index, { count: appIds.length }))
  );
  syncGrid(grid);
  count.textContent = `${appIds.length} of ${GRID_SIZE} apps.`;

  const full = appIds.length >= GRID_SIZE;
  const onlyOne = appIds.length === 1;
  fullNote.hidden = !full;
  for (const [id, input] of checkboxes) {
    input.checked = appIds.includes(id);
    // Full grid: can't add more. One app left: can't remove it (never empty).
    input.disabled = (full && !input.checked) || (onlyOne && input.checked);
    input.title = input.disabled
      ? input.checked ? "Your grid needs at least one app." : "Your grid is full."
      : "";
  }
}

function showStatus(message, isError = false) {
  clearTimeout(statusTimer);
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  if (!isError) statusTimer = setTimeout(() => { status.textContent = ""; }, STATUS_MS);
}

// --- Changes (each saves immediately) -----------------------------------------
async function commit(next) {
  const previous = appIds;
  render(next);
  try {
    render(await saveAppIds(next));
    showStatus("Saved");
  } catch {
    render(previous); // not saved: show what's actually stored
    showStatus("Couldn't save. Please try again.", true);
  }
}

function toggleApp(id, checked) {
  const next = checked ? [...appIds, id] : appIds.filter((appId) => appId !== id);
  commit(next);
}

// A group of radio buttons for one setting (`name`): saves a change
// immediately, and calls `apply(value)` whenever the shown value changes.
// Returns a function that shows a value without saving it.
function radioSetting(name, save, apply = () => {}) {
  const inputs = [...document.querySelectorAll(`input[name="${name}"]`)];
  let value;
  const show = (next) => {
    value = next;
    apply(value);
    for (const input of inputs) input.checked = input.value === value;
  };
  for (const input of inputs) {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      const previous = value;
      show(input.value);
      try {
        show(await save(input.value));
        showStatus("Saved");
      } catch {
        show(previous); // not saved: show what's actually stored
        showStatus("Couldn't save. Please try again.", true);
      }
    });
  }
  return show;
}

const showOpenMode = radioSetting("open", saveOpenMode);
const showTheme = radioSetting("theme", saveTheme, applyTheme);

// Resets everything: the default apps, opening in a new tab, and the
// Automatic theme.
async function restoreDefaults() {
  try {
    const defaults = await resetSettings();
    render(defaults.apps);
    showOpenMode(defaults.open);
    showTheme(defaults.theme);
    showStatus("Saved");
  } catch {
    showStatus("Couldn't save. Please try again.", true);
  }
}

// --- Start ------------------------------------------------------------------
limitHint.textContent = `Pick up to ${GRID_SIZE} apps. New apps are added to the end of your grid.`;
buildPicker();
const reorder = (from, to) => commit(moveItem(appIds, from, to));
enableDragReorder(grid, reorder);
enableKeyboardReorder(grid, reorder);
orderHint.textContent =
  `Drag apps to change their order. With the keyboard, use the arrow keys to pick an app and ${MOVE_KEY_LABEL} + arrow keys to move it.`;
backgroundNote.textContent =
  `${IS_MAC ? "Cmd" : "Ctrl"}-click or middle-click an app to open it in a background tab ` +
  "and keep the popup open, whichever setting you choose.";
restore.addEventListener("click", restoreDefaults);
const [ids, savedOpenMode, savedTheme] =
  await Promise.all([loadAppIds(), loadOpenMode(), loadTheme()]);
showTheme(savedTheme);
showOpenMode(savedOpenMode);
render(ids);
onAppIdsChanged(render);
onOpenModeChanged(showOpenMode);
onThemeChanged(showTheme);
