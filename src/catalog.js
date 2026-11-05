// -----------------------------------------------------------------------------
// The app catalog in display order: services, then their groups, then apps
// alphabetized within each group. Used by the options page and by the README
// generator (scripts/readme-apps.mjs), so both always show the same order.
// -----------------------------------------------------------------------------
import { APPS, SERVICES } from "./apps.js";

// The name an app is alphabetized by: its full name without a leading
// "Google", so "Google Calendar" sorts under C. The full name is still shown.
export function sortName(name) {
  return name.replace(/^Google\s+/i, "");
}

export function compareApps(a, b) {
  return sortName(a.name).localeCompare(sortName(b.name), "en", { sensitivity: "base" });
}

// Returns [{ key, name, sections: [{ key, name, apps }] }]. A service without
// groups has a single section with key and name null. Empty sections and
// services are left out.
export function catalog(apps = APPS, services = SERVICES) {
  return Object.entries(services)
    .map(([key, service]) => {
      const own = apps.filter((app) => app.service === key);
      const groups = service.groups ? Object.entries(service.groups) : [[null, null]];
      const sections = groups
        .map(([groupKey, groupName]) => ({
          key: groupKey,
          name: groupName,
          apps: own.filter((app) => groupKey === null || app.group === groupKey).sort(compareApps),
        }))
        .filter((section) => section.apps.length);
      return { key, name: service.name, sections };
    })
    .filter((service) => service.sections.length);
}
