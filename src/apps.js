// -----------------------------------------------------------------------------
// App registry: every app WaffleLauncher can show, and the default grid.
//
// This is the only file to edit when adding an app or a service:
//   - New app:     add one entry to APPS, and its icon under icons/<service>/.
//   - New service: add it to SERVICES, then add its apps.
// Run `npm run check` afterwards to catch mistakes.
//
// Fields for each app:
//   id         Internal, permanent ID: "<service>-<app>", lowercase with dashes.
//              Stored in the user's settings, so never rename one once released.
//   service    A key of SERVICES.
//   shortName  Shown under the icon on a popup tile (about 10 characters fit).
//   name       Full name, shown in the tile's tooltip and on the options page.
//   url        Where the app opens. Plain https URL, no tracking parameters.
//   icon       Path relative to src/: an .svg or .png bundled with the add-on.
// -----------------------------------------------------------------------------

// Maximum number of apps in the popup grid (3×3).
export const GRID_SIZE = 9;

// Services, in the order their sections appear on the options page.
export const SERVICES = Object.freeze({
  google: { name: "Google" },
});

// Temporary icon until official icons are added. `npm run check -- --release`
// fails while any app still uses it.
const PLACEHOLDER = "icons/placeholder.svg";

export const APPS = Object.freeze([
  { id: "google-gmail",         service: "google", shortName: "Gmail",      name: "Gmail",            url: "https://mail.google.com/",       icon: PLACEHOLDER },
  { id: "google-calendar",      service: "google", shortName: "Calendar",   name: "Google Calendar",  url: "https://calendar.google.com/",   icon: PLACEHOLDER },
  { id: "google-sheets",        service: "google", shortName: "Sheets",     name: "Google Sheets",    url: "https://sheets.google.com/",     icon: PLACEHOLDER },
  { id: "google-drive",         service: "google", shortName: "Drive",      name: "Google Drive",     url: "https://drive.google.com/",      icon: PLACEHOLDER },
  { id: "google-gemini",        service: "google", shortName: "Gemini",     name: "Google Gemini",    url: "https://gemini.google.com/",     icon: PLACEHOLDER },
  { id: "google-docs",          service: "google", shortName: "Docs",       name: "Google Docs",      url: "https://docs.google.com/",       icon: PLACEHOLDER },
  { id: "google-photos",        service: "google", shortName: "Photos",     name: "Google Photos",    url: "https://photos.google.com/",     icon: PLACEHOLDER },
  { id: "google-maps",          service: "google", shortName: "Maps",       name: "Google Maps",      url: "https://maps.google.com/",       icon: PLACEHOLDER },
  { id: "google-keep",          service: "google", shortName: "Keep",       name: "Google Keep",      url: "https://keep.google.com/",       icon: PLACEHOLDER },
  { id: "google-slides",        service: "google", shortName: "Slides",     name: "Google Slides",    url: "https://slides.google.com/",     icon: PLACEHOLDER },
  { id: "google-meet",          service: "google", shortName: "Meet",       name: "Google Meet",      url: "https://meet.google.com/",       icon: PLACEHOLDER },
  { id: "google-contacts",      service: "google", shortName: "Contacts",   name: "Google Contacts",  url: "https://contacts.google.com/",   icon: PLACEHOLDER },
  { id: "google-classroom",     service: "google", shortName: "Classroom",  name: "Google Classroom", url: "https://classroom.google.com/",  icon: PLACEHOLDER },
  { id: "google-gemini-notebook", service: "google", shortName: "Notebook", name: "Gemini Notebook",  url: "https://notebook.google.com/",   icon: PLACEHOLDER },
  { id: "google-translate",     service: "google", shortName: "Translate",  name: "Google Translate", url: "https://translate.google.com/",  icon: PLACEHOLDER },
  { id: "google-news",          service: "google", shortName: "News",       name: "Google News",      url: "https://news.google.com/",       icon: PLACEHOLDER },
  { id: "google-messages",      service: "google", shortName: "Messages",   name: "Google Messages",  url: "https://messages.google.com/",   icon: PLACEHOLDER },
  { id: "google-voice",         service: "google", shortName: "Voice",      name: "Google Voice",     url: "https://voice.google.com/",      icon: PLACEHOLDER },
  { id: "google-groups",        service: "google", shortName: "Groups",     name: "Google Groups",    url: "https://groups.google.com/",     icon: PLACEHOLDER },
  { id: "google-play",          service: "google", shortName: "Play",       name: "Google Play",      url: "https://play.google.com/",       icon: PLACEHOLDER },
  { id: "google-youtube",       service: "google", shortName: "YouTube",    name: "YouTube",          url: "https://www.youtube.com/",       icon: PLACEHOLDER },
  { id: "google-youtube-music", service: "google", shortName: "YT Music",   name: "YouTube Music",    url: "https://music.youtube.com/",     icon: PLACEHOLDER },
  { id: "google-search",        service: "google", shortName: "Search",     name: "Google Search",    url: "https://www.google.com/",        icon: PLACEHOLDER },

  // Google Workspace
  { id: "google-chat",          service: "google", shortName: "Chat",       name: "Google Chat",          url: "https://chat.google.com/",          icon: PLACEHOLDER },
  { id: "google-forms",         service: "google", shortName: "Forms",      name: "Google Forms",         url: "https://docs.google.com/forms/",    icon: PLACEHOLDER },
  { id: "google-sites",         service: "google", shortName: "Sites",      name: "Google Sites",         url: "https://sites.google.com/",         icon: PLACEHOLDER },
  { id: "google-tasks",         service: "google", shortName: "Tasks",      name: "Google Tasks",         url: "https://tasks.google.com/",         icon: PLACEHOLDER },
  { id: "google-vids",          service: "google", shortName: "Vids",       name: "Google Vids",          url: "https://vids.google.com/",          icon: PLACEHOLDER },
  { id: "google-admin",         service: "google", shortName: "Admin",      name: "Google Admin console", url: "https://admin.google.com/",         icon: PLACEHOLDER },

  // Everyday
  { id: "google-account",       service: "google", shortName: "Account",    name: "Google Account",       url: "https://myaccount.google.com/",     icon: PLACEHOLDER },
  { id: "google-earth",         service: "google", shortName: "Earth",      name: "Google Earth",         url: "https://earth.google.com/web/",     icon: PLACEHOLDER },
  { id: "google-wallet",        service: "google", shortName: "Wallet",     name: "Google Wallet",        url: "https://wallet.google.com/",        icon: PLACEHOLDER },
  { id: "google-one",           service: "google", shortName: "Google One", name: "Google One",           url: "https://one.google.com/",           icon: PLACEHOLDER },
  { id: "google-home",          service: "google", shortName: "Home",       name: "Google Home",          url: "https://home.google.com/",          icon: PLACEHOLDER },
  { id: "google-find-hub",      service: "google", shortName: "Find Hub",   name: "Find Hub",             url: "https://www.google.com/android/find", icon: PLACEHOLDER },
  { id: "google-finance",       service: "google", shortName: "Finance",    name: "Google Finance",       url: "https://www.google.com/finance",    icon: PLACEHOLDER },
  { id: "google-flights",       service: "google", shortName: "Flights",    name: "Google Flights",       url: "https://www.google.com/travel/flights", icon: PLACEHOLDER },
  { id: "google-shopping",      service: "google", shortName: "Shopping",   name: "Google Shopping",      url: "https://shopping.google.com/",      icon: PLACEHOLDER },
  { id: "google-scholar",       service: "google", shortName: "Scholar",    name: "Google Scholar",       url: "https://scholar.google.com/",       icon: PLACEHOLDER },
  { id: "google-arts-culture",  service: "google", shortName: "Arts",       name: "Google Arts & Culture", url: "https://artsandculture.google.com/", icon: PLACEHOLDER },
  { id: "google-play-books",    service: "google", shortName: "Play Books", name: "Google Play Books",    url: "https://play.google.com/store/books", icon: PLACEHOLDER },
  { id: "google-blogger",       service: "google", shortName: "Blogger",    name: "Blogger",              url: "https://www.blogger.com/",          icon: PLACEHOLDER },
  { id: "google-youtube-kids",  service: "google", shortName: "YT Kids",    name: "YouTube Kids",         url: "https://www.youtubekids.com/",      icon: PLACEHOLDER },
  { id: "google-youtube-tv",    service: "google", shortName: "YouTube TV", name: "YouTube TV",           url: "https://tv.youtube.com/",           icon: PLACEHOLDER },
  { id: "google-fonts",         service: "google", shortName: "Fonts",      name: "Google Fonts",         url: "https://fonts.google.com/",         icon: PLACEHOLDER },
  { id: "google-trends",        service: "google", shortName: "Trends",     name: "Google Trends",        url: "https://trends.google.com/",        icon: PLACEHOLDER },

  // Business and developer
  { id: "google-ads",           service: "google", shortName: "Ads",        name: "Google Ads",           url: "https://ads.google.com/",           icon: PLACEHOLDER },
  { id: "google-analytics",     service: "google", shortName: "Analytics",  name: "Google Analytics",     url: "https://analytics.google.com/",     icon: PLACEHOLDER },
  { id: "google-search-console", service: "google", shortName: "Console",   name: "Google Search Console", url: "https://search.google.com/search-console", icon: PLACEHOLDER },
  { id: "google-cloud-console", service: "google", shortName: "Cloud",      name: "Google Cloud console", url: "https://console.cloud.google.com/", icon: PLACEHOLDER },
  { id: "google-business-profile", service: "google", shortName: "Business", name: "Google Business Profile", url: "https://business.google.com/", icon: PLACEHOLDER },
  { id: "google-ai-studio",     service: "google", shortName: "AI Studio",  name: "Google AI Studio",     url: "https://aistudio.google.com/",      icon: PLACEHOLDER },
  { id: "google-labs",          service: "google", shortName: "Labs",       name: "Google Labs",          url: "https://labs.google/",              icon: PLACEHOLDER },
].map((app) => Object.freeze(app)));

// The grid a new user starts with, in order. Listed explicitly so that adding
// or reordering APPS never changes the defaults by accident.
export const DEFAULT_APP_IDS = Object.freeze([
  "google-gmail",  "google-calendar", "google-sheets",
  "google-drive",  "google-gemini",   "google-docs",
  "google-photos", "google-maps",     "google-keep",
]);
