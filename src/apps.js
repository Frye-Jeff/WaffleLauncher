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

// A new app without its official icon yet can use "icons/placeholder.svg".
// `npm run check -- --release` fails while any app still uses it.

export const APPS = Object.freeze([
  { id: "google-gmail",         service: "google", shortName: "Gmail",      name: "Gmail",            url: "https://mail.google.com/",       icon: "icons/google/gmail.png" },
  { id: "google-calendar",      service: "google", shortName: "Calendar",   name: "Google Calendar",  url: "https://calendar.google.com/",   icon: "icons/google/calendar.png" },
  { id: "google-sheets",        service: "google", shortName: "Sheets",     name: "Google Sheets",    url: "https://sheets.google.com/",     icon: "icons/google/sheets.png" },
  { id: "google-drive",         service: "google", shortName: "Drive",      name: "Google Drive",     url: "https://drive.google.com/",      icon: "icons/google/drive.png" },
  { id: "google-gemini",        service: "google", shortName: "Gemini",     name: "Google Gemini",    url: "https://gemini.google.com/",     icon: "icons/google/gemini.png" },
  { id: "google-docs",          service: "google", shortName: "Docs",       name: "Google Docs",      url: "https://docs.google.com/",       icon: "icons/google/docs.png" },
  { id: "google-photos",        service: "google", shortName: "Photos",     name: "Google Photos",    url: "https://photos.google.com/",     icon: "icons/google/photos.png" },
  { id: "google-maps",          service: "google", shortName: "Maps",       name: "Google Maps",      url: "https://maps.google.com/",       icon: "icons/google/maps.png" },
  { id: "google-keep",          service: "google", shortName: "Keep",       name: "Google Keep",      url: "https://keep.google.com/",       icon: "icons/google/keep.png" },
  { id: "google-slides",        service: "google", shortName: "Slides",     name: "Google Slides",    url: "https://slides.google.com/",     icon: "icons/google/slides.png" },
  { id: "google-meet",          service: "google", shortName: "Meet",       name: "Google Meet",      url: "https://meet.google.com/",       icon: "icons/google/meet.png" },
  { id: "google-contacts",      service: "google", shortName: "Contacts",   name: "Google Contacts",  url: "https://contacts.google.com/",   icon: "icons/google/contacts.png" },
  { id: "google-classroom",     service: "google", shortName: "Classroom",  name: "Google Classroom", url: "https://classroom.google.com/",  icon: "icons/google/classroom.png" },
  { id: "google-gemini-notebook", service: "google", shortName: "Notebook", name: "Gemini Notebook",  url: "https://notebook.google.com/",   icon: "icons/google/gemini-notebook.png" },
  { id: "google-translate",     service: "google", shortName: "Translate",  name: "Google Translate", url: "https://translate.google.com/",  icon: "icons/google/translate.png" },
  { id: "google-news",          service: "google", shortName: "News",       name: "Google News",      url: "https://news.google.com/",       icon: "icons/google/news.png" },
  { id: "google-messages",      service: "google", shortName: "Messages",   name: "Google Messages",  url: "https://messages.google.com/",   icon: "icons/google/messages.png" },
  { id: "google-voice",         service: "google", shortName: "Voice",      name: "Google Voice",     url: "https://voice.google.com/",      icon: "icons/google/voice.png" },
  { id: "google-groups",        service: "google", shortName: "Groups",     name: "Google Groups",    url: "https://groups.google.com/",     icon: "icons/google/groups.png" },
  { id: "google-play",          service: "google", shortName: "Play",       name: "Google Play",      url: "https://play.google.com/",       icon: "icons/google/play.png" },
  { id: "google-youtube",       service: "google", shortName: "YouTube",    name: "YouTube",          url: "https://www.youtube.com/",       icon: "icons/google/youtube.png" },
  { id: "google-youtube-music", service: "google", shortName: "YT Music",   name: "YouTube Music",    url: "https://music.youtube.com/",     icon: "icons/google/youtube-music.png" },
  { id: "google-search",        service: "google", shortName: "Search",     name: "Google Search",    url: "https://www.google.com/",        icon: "icons/google/search.png" },

  // Google Workspace
  { id: "google-chat",          service: "google", shortName: "Chat",       name: "Google Chat",          url: "https://chat.google.com/",          icon: "icons/google/chat.png" },
  { id: "google-forms",         service: "google", shortName: "Forms",      name: "Google Forms",         url: "https://docs.google.com/forms/",    icon: "icons/google/forms.png" },
  { id: "google-sites",         service: "google", shortName: "Sites",      name: "Google Sites",         url: "https://sites.google.com/",         icon: "icons/google/sites.png" },
  { id: "google-tasks",         service: "google", shortName: "Tasks",      name: "Google Tasks",         url: "https://tasks.google.com/",         icon: "icons/google/tasks.png" },
  { id: "google-vids",          service: "google", shortName: "Vids",       name: "Google Vids",          url: "https://vids.google.com/",          icon: "icons/google/vids.png" },
  { id: "google-admin",         service: "google", shortName: "Admin",      name: "Google Admin console", url: "https://admin.google.com/",         icon: "icons/google/admin.png" },

  // Everyday
  { id: "google-account",       service: "google", shortName: "Account",    name: "Google Account",       url: "https://myaccount.google.com/",     icon: "icons/google/account.png" },
  { id: "google-earth",         service: "google", shortName: "Earth",      name: "Google Earth",         url: "https://earth.google.com/web/",     icon: "icons/google/earth.png" },
  { id: "google-wallet",        service: "google", shortName: "Wallet",     name: "Google Wallet",        url: "https://wallet.google.com/",        icon: "icons/google/wallet.png" },
  { id: "google-one",           service: "google", shortName: "Google One", name: "Google One",           url: "https://one.google.com/",           icon: "icons/google/one.png" },
  { id: "google-home",          service: "google", shortName: "Home",       name: "Google Home",          url: "https://home.google.com/",          icon: "icons/google/home.png" },
  { id: "google-find-hub",      service: "google", shortName: "Find Hub",   name: "Find Hub",             url: "https://www.google.com/android/find", icon: "icons/google/find-hub.png" },
  { id: "google-finance",       service: "google", shortName: "Finance",    name: "Google Finance",       url: "https://www.google.com/finance",    icon: "icons/google/finance.png" },
  { id: "google-flights",       service: "google", shortName: "Flights",    name: "Google Flights",       url: "https://www.google.com/travel/flights", icon: "icons/google/flights.png" },
  { id: "google-shopping",      service: "google", shortName: "Shopping",   name: "Google Shopping",      url: "https://shopping.google.com/",      icon: "icons/google/shopping.png" },
  { id: "google-scholar",       service: "google", shortName: "Scholar",    name: "Google Scholar",       url: "https://scholar.google.com/",       icon: "icons/google/scholar.png" },
  { id: "google-arts-culture",  service: "google", shortName: "Arts",       name: "Google Arts & Culture", url: "https://artsandculture.google.com/", icon: "icons/google/arts-culture.png" },
  { id: "google-play-books",    service: "google", shortName: "Play Books", name: "Google Play Books",    url: "https://play.google.com/store/books", icon: "icons/google/play-books.png" },
  { id: "google-blogger",       service: "google", shortName: "Blogger",    name: "Blogger",              url: "https://www.blogger.com/",          icon: "icons/google/blogger.png" },
  { id: "google-youtube-kids",  service: "google", shortName: "YT Kids",    name: "YouTube Kids",         url: "https://www.youtubekids.com/",      icon: "icons/google/youtube-kids.png" },
  { id: "google-youtube-tv",    service: "google", shortName: "YouTube TV", name: "YouTube TV",           url: "https://tv.youtube.com/",           icon: "icons/google/youtube-tv.png" },
  { id: "google-fonts",         service: "google", shortName: "Fonts",      name: "Google Fonts",         url: "https://fonts.google.com/",         icon: "icons/google/fonts.png" },
  { id: "google-trends",        service: "google", shortName: "Trends",     name: "Google Trends",        url: "https://trends.google.com/",        icon: "icons/google/trends.png" },

  // Business and developer
  { id: "google-ads",           service: "google", shortName: "Ads",        name: "Google Ads",           url: "https://ads.google.com/",           icon: "icons/google/ads.png" },
  { id: "google-analytics",     service: "google", shortName: "Analytics",  name: "Google Analytics",     url: "https://analytics.google.com/",     icon: "icons/google/analytics.png" },
  { id: "google-search-console", service: "google", shortName: "Console",   name: "Google Search Console", url: "https://search.google.com/search-console", icon: "icons/google/search-console.png" },
  { id: "google-cloud-console", service: "google", shortName: "Cloud",      name: "Google Cloud console", url: "https://console.cloud.google.com/", icon: "icons/google/cloud-console.png" },
  { id: "google-business-profile", service: "google", shortName: "Business", name: "Google Business Profile", url: "https://business.google.com/", icon: "icons/google/business-profile.png" },
  { id: "google-ai-studio",     service: "google", shortName: "AI Studio",  name: "Google AI Studio",     url: "https://aistudio.google.com/",      icon: "icons/google/ai-studio.png" },
  { id: "google-labs",          service: "google", shortName: "Labs",       name: "Google Labs",          url: "https://labs.google/",              icon: "icons/google/labs.png" },
].map((app) => Object.freeze(app)));

// The grid a new user starts with, in order. Listed explicitly so that adding
// or reordering APPS never changes the defaults by accident.
export const DEFAULT_APP_IDS = Object.freeze([
  "google-gmail",  "google-calendar", "google-sheets",
  "google-drive",  "google-gemini",   "google-docs",
  "google-photos", "google-maps",     "google-keep",
]);
