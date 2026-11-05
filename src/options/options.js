// -----------------------------------------------------------------------------
// Options page: choose which apps appear (checkboxes grouped by service), their
// order (drag in the grid preview), and the theme. Every change saves
// immediately.
// -----------------------------------------------------------------------------
import { APPS, GRID_SIZE, SERVICES } from "../apps.js";
import {
  loadAppIds,
  loadTheme,
  moveItem,
  onAppIdsChanged,
  onThemeChanged,
  resetSettings,
  saveAppIds,
  saveTheme,
} from "../settings.js";
import {
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
const themeInputs = [...document.querySelectorAll('input[name="theme"]')];

const checkboxes = new Map(); // app id -> <input type="checkbox">
let appIds = [];
let theme = "auto";
let statusTimer;

// --- Drawing ----------------------------------------------------------------
function buildPicker() {
  for (const [serviceKey, service] of Object.entries(SERVICES)) {
    const apps = APPS.filter((app) => app.service === serviceKey);
    if (!apps.length) continue;

    const heading = document.createElement("h3");
    heading.textContent = service.name;

    const list = document.createElement("ul");
    list.className = "picker";
    list.setAttribute("aria-label", `${service.name} apps`);

    for (const app of apps) {
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
      list.append(item);
    }
    services.append(heading, list);
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

function renderTheme(next) {
  theme = next;
  applyTheme(theme);
  for (const input of themeInputs) input.checked = input.value === theme;
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

async function chooseTheme(next) {
  const previous = theme;
  renderTheme(next);
  try {
    renderTheme(await saveTheme(next));
    showStatus("Saved");
  } catch {
    renderTheme(previous); // not saved: show what's actually stored
    showStatus("Couldn't save. Please try again.", true);
  }
}

// Resets everything: the default apps and the Automatic theme.
async function restoreDefaults() {
  try {
    const defaults = await resetSettings();
    render(defaults.apps);
    renderTheme(defaults.theme);
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
restore.addEventListener("click", restoreDefaults);
for (const input of themeInputs) {
  input.addEventListener("change", () => { if (input.checked) chooseTheme(input.value); });
}
const [ids, savedTheme] = await Promise.all([loadAppIds(), loadTheme()]);
renderTheme(savedTheme);
render(ids);
onAppIdsChanged(render);
onThemeChanged(renderTheme);
