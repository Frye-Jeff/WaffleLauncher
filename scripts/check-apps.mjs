// -----------------------------------------------------------------------------
// Dev-only check of the app registry (src/apps.js). Not shipped in the add-on.
//
//   npm run check               Errors fail; placeholder icons are a warning.
//   npm run check -- --release  Placeholder icons also fail (use before release).
// -----------------------------------------------------------------------------
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const { APPS, SERVICES, DEFAULT_APP_IDS, DEFAULT_4X4_EXTRA_IDS } = await import(
  pathToFileURL(join(SRC, "apps.js")).href
);
const { DEFAULT_GRID_SIZE, gridCapacity } = await import(
  pathToFileURL(join(SRC, "settings.js")).href
);
const DEFAULT_CAPACITY = gridCapacity(DEFAULT_GRID_SIZE);

const release = process.argv.includes("--release");
const errors = [];
const warnings = [];

const ID_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)+$/;
const SHORT_NAME_MAX = 10;
const PNG_MIN_SIZE = 128;
const PLACEHOLDER = "icons/placeholder.svg";

// Anything in an SVG that could make Firefox load something from outside the
// add-on: external links, CSS url()/@import, scripts, or embedded HTML.
const SVG_EXTERNAL = [
  [/(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:|file:)/i, "external link or embedded data"],
  [/url\(\s*["']?\s*(?:https?:|\/\/|data:|file:)/i, "CSS url() to an outside resource"],
  [/@import/i, "CSS @import"],
  [/<script/i, "<script>"],
  [/<foreignObject/i, "<foreignObject> (embedded HTML)"],
  [/<!ENTITY/i, "XML entity (can reference outside files)"],
];

// --- Services ---------------------------------------------------------------
for (const [key, service] of Object.entries(SERVICES)) {
  if (!/^[a-z0-9]+$/.test(key)) errors.push(`service "${key}": key must be lowercase letters/digits only`);
  if (!service?.name) errors.push(`service "${key}": missing name`);
  for (const [groupKey, groupName] of Object.entries(service?.groups ?? {})) {
    if (!/^[a-z0-9-]+$/.test(groupKey)) errors.push(`service "${key}": group key "${groupKey}" must be lowercase`);
    if (typeof groupName !== "string" || !groupName.trim()) errors.push(`service "${key}": group "${groupKey}" needs a name`);
  }
}

// --- Apps -------------------------------------------------------------------
const ids = new Set();
const iconChecked = new Set();
let placeholderCount = 0;

for (const [index, app] of APPS.entries()) {
  const label = app?.id ? `app "${app.id}"` : `app #${index + 1}`;

  const missing = ["id", "service", "shortName", "name", "url", "icon"].filter(
    (field) => typeof app?.[field] !== "string" || app[field].trim() === ""
  );
  for (const field of missing) errors.push(`${label}: missing or empty "${field}"`);
  if (missing.length) continue;

  // ID: unique, right format, prefixed with its service.
  if (ids.has(app.id)) errors.push(`${label}: duplicate id`);
  ids.add(app.id);
  if (!ID_FORMAT.test(app.id)) errors.push(`${label}: id must look like "<service>-<app>" (lowercase, dashes)`);
  if (!Object.hasOwn(SERVICES, app.service)) {
    errors.push(`${label}: unknown service "${app.service}" (add it to SERVICES)`);
  } else {
    if (!app.id.startsWith(`${app.service}-`)) errors.push(`${label}: id must start with "${app.service}-"`);
    const groups = SERVICES[app.service].groups;
    if (groups && !Object.hasOwn(groups, app.group)) {
      errors.push(`${label}: group must be one of ${Object.keys(groups).join(", ")} (got "${app.group}")`);
    } else if (!groups && app.group !== undefined) {
      errors.push(`${label}: service "${app.service}" has no groups, so remove "group"`);
    }
  }

  if (app.shortName?.length > SHORT_NAME_MAX) {
    warnings.push(`${label}: shortName "${app.shortName}" is over ${SHORT_NAME_MAX} characters and may be cut off on the tile`);
  }

  // URL: valid, https, no tracking-style query string or credentials.
  try {
    const url = new URL(app.url);
    if (url.protocol !== "https:") errors.push(`${label}: url must use https://`);
    if (url.username || url.password) errors.push(`${label}: url must not contain credentials`);
    if (url.search) warnings.push(`${label}: url has a query string (${url.search}); make sure it isn't tracking`);
  } catch {
    errors.push(`${label}: url "${app.url}" is not a valid URL`);
  }

  // Icon: bundled .svg/.png that exists; SVGs self-contained; PNGs big enough.
  if (app.icon === PLACEHOLDER) placeholderCount++;
  const ext = extname(app.icon ?? "").toLowerCase();
  if (ext !== ".svg" && ext !== ".png") {
    errors.push(`${label}: icon must be .svg or .png`);
    continue;
  }
  if (/^[a-z]+:|^\/\//i.test(app.icon)) {
    errors.push(`${label}: icon must be a bundled file, not a URL`);
    continue;
  }
  const iconPath = join(SRC, app.icon);
  if (!existsSync(iconPath)) {
    errors.push(`${label}: icon file not found: src/${app.icon}`);
    continue;
  }
  if (iconChecked.has(iconPath)) continue;
  iconChecked.add(iconPath);

  if (ext === ".svg") {
    const svg = readFileSync(iconPath, "utf8");
    for (const [pattern, what] of SVG_EXTERNAL) {
      if (pattern.test(svg)) errors.push(`src/${app.icon}: privacy: contains ${what}`);
    }
    // Common ways an SVG becomes invalid XML, which Firefox then won't display.
    if (!/<svg[\s>]/i.test(svg)) errors.push(`src/${app.icon}: no <svg> element found`);
    for (const [, comment] of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
      if (comment.includes("--")) errors.push(`src/${app.icon}: "--" inside an XML comment makes the SVG invalid`);
    }
  } else {
    const png = readFileSync(iconPath);
    const isPng = png.length > 24 && png.toString("latin1", 1, 4) === "PNG";
    if (!isPng) {
      errors.push(`src/${app.icon}: not a valid PNG file`);
    } else {
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      if (width < PNG_MIN_SIZE || height < PNG_MIN_SIZE) {
        warnings.push(`src/${app.icon}: ${width}×${height} PNG may look blurry; ${PNG_MIN_SIZE}×${PNG_MIN_SIZE} or larger is recommended`);
      }
    }
  }
}

// --- Defaults ---------------------------------------------------------------
if (DEFAULT_APP_IDS.length !== DEFAULT_CAPACITY) {
  errors.push(`DEFAULT_APP_IDS has ${DEFAULT_APP_IDS.length} apps; it must fill the default ${DEFAULT_GRID_SIZE} grid (${DEFAULT_CAPACITY})`);
}
const seenDefaults = new Set();
for (const [listName, list] of [
  ["DEFAULT_APP_IDS", DEFAULT_APP_IDS],
  ["DEFAULT_4X4_EXTRA_IDS", DEFAULT_4X4_EXTRA_IDS],
]) {
  for (const id of list) {
    if (!ids.has(id)) errors.push(`${listName}: "${id}" is not an app in APPS`);
    if (seenDefaults.has(id)) errors.push(`${listName}: "${id}" is already a default`);
    seenDefaults.add(id);
  }
}
const capacity4x4 = gridCapacity("4x4");
if (DEFAULT_APP_IDS.length + DEFAULT_4X4_EXTRA_IDS.length !== capacity4x4) {
  errors.push(`DEFAULT_APP_IDS plus DEFAULT_4X4_EXTRA_IDS must fill the 4x4 grid (${capacity4x4})`);
}

// --- README supported-apps list ---------------------------------------------
const { buildAppsSection, currentAppsSection } = await import("./readme-apps.mjs");
const readmeSection = currentAppsSection();
if (readmeSection === null) {
  errors.push("README.md: supported-apps markers are missing");
} else if (readmeSection !== buildAppsSection()) {
  errors.push("README.md: supported-apps list is out of date; run `npm run readme-apps`");
}

// --- Placeholder icons ------------------------------------------------------
if (placeholderCount > 0) {
  const message = `${placeholderCount} of ${APPS.length} apps still use the placeholder icon`;
  (release ? errors : warnings).push(message);
}

// --- Report -----------------------------------------------------------------
for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`error:   ${e}`);
console.log(
  `\nChecked ${APPS.length} apps in ${Object.keys(SERVICES).length} service(s): ` +
  `${errors.length} error(s), ${warnings.length} warning(s)${release ? " [release mode]" : ""}`
);
process.exitCode = errors.length ? 1 : 0;
