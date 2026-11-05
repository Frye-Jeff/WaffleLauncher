import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { APPS, SERVICES } from "../src/apps.js";
import { catalog, compareApps, sortName } from "../src/catalog.js";

describe("sortName", () => {
  test("drops a leading Google", () => {
    assert.equal(sortName("Google Calendar"), "Calendar");
    assert.equal(sortName("Google Arts & Culture"), "Arts & Culture");
  });

  test("leaves other names alone", () => {
    for (const name of ["Gmail", "YouTube", "Find Hub", "Gemini Notebook", "Googleplex"]) {
      assert.equal(sortName(name), name);
    }
  });
});

describe("compareApps", () => {
  test("sorts ignoring Google and letter case", () => {
    const names = ["Google Calendar", "Blogger", "Google Account", "Gmail", "Google AI Studio", "Google Ads"];
    const sorted = names.map((name) => ({ name })).sort(compareApps).map((app) => app.name);
    assert.deepEqual(sorted, ["Google Account", "Google Ads", "Google AI Studio", "Blogger", "Google Calendar", "Gmail"]);
  });
});

describe("catalog", () => {
  const google = catalog().find((service) => service.key === "google");

  test("Google has the Everyday and Business and developer groups, in that order", () => {
    assert.deepEqual(
      google.sections.map((section) => section.name),
      ["Everyday", "Business and developer"],
    );
  });

  test("every app appears exactly once", () => {
    const listed = catalog().flatMap((s) => s.sections.flatMap((section) => section.apps.map((a) => a.id)));
    assert.equal(listed.length, APPS.length);
    assert.deepEqual(new Set(listed), new Set(APPS.map((app) => app.id)));
  });

  test("apps are alphabetical within each group", () => {
    for (const section of google.sections) {
      const keys = section.apps.map((app) => sortName(app.name));
      const sorted = [...keys].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
      assert.deepEqual(keys, sorted, section.name);
    }
  });

  test("Business and developer holds exactly the 8 business apps", () => {
    const business = google.sections.find((section) => section.key === "business");
    assert.deepEqual(business.apps.map((app) => app.id), [
      "google-admin",
      "google-ads",
      "google-ai-studio",
      "google-analytics",
      "google-business-profile",
      "google-cloud-console",
      "google-labs",
      "google-search-console",
    ]);
  });

  test("a service without groups gets one unnamed section; empty ones are left out", () => {
    const apps = [
      { id: "proton-mail", service: "proton", name: "Proton Mail" },
      { id: "proton-drive", service: "proton", name: "Proton Drive" },
    ];
    const services = { proton: { name: "Proton" }, empty: { name: "Empty" } };
    assert.deepEqual(catalog(apps, services), [{
      key: "proton",
      name: "Proton",
      sections: [{ key: null, name: null, apps: [apps[1], apps[0]] }],
    }]);
  });

  test("uses the real SERVICES order", () => {
    assert.deepEqual(catalog().map((service) => service.key), Object.keys(SERVICES));
  });
});
