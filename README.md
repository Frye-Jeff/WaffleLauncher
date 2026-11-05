# WaffleLauncher

A privacy-first Firefox add-on that puts your favorite web apps one click away. Click the waffle button in the toolbar to get a 3×3 grid of your apps, and click one to open it in a new tab.

- **Toolbar waffle button** that matches light and dark Firefox themes
- **3×3 grid** of the apps you choose
- **Drag to reorder**, right in the popup
- **Options page** to pick which apps appear
- **Light, dark or automatic** look, matching Firefox by default
- **Syncs** your choices between devices through Firefox Sync, if you use it

## Privacy

WaffleLauncher collects no data. None.

- **No data collection, analytics or telemetry.** The add-on declares to Firefox that it collects no data.
- **One permission: `storage`.** It's used only to remember your choices.
- **The only things stored are your chosen apps, in order, and your theme choice** (Light or Dark; Automatic stores nothing). If you use Firefox Sync, they sync between your devices like your other Firefox settings. Nothing about your browsing, clicks or usage is stored.
- **No network requests.** Every icon and script is bundled with the add-on, and its pages run under a strict content security policy that blocks loading anything from the internet.
- **No access to websites.** That's why Firefox's Extensions menu shows *"Can't read and change data on this site"* for WaffleLauncher. It can't see or change any page you visit.
- **Plain links.** Apps open at their normal addresses, with no tracking or referral codes added.

## Install

Coming soon to [addons.mozilla.org](https://addons.mozilla.org/). Requires Firefox 140 or later (Firefox for Android 142 or later).

## Using it

**Popup.** Click the waffle button in the toolbar.

- Click an app to open it in a new tab. You can also press Tab to move between apps and Enter to open one.
- Hover over an app to see its full name.
- Drag an app onto another to move it there. The new order saves right away.

**Options page.** Open `about:addons`, click WaffleLauncher, then **Preferences**. It opens in its own tab.

- Check an app to add it to the end of your grid; uncheck it to remove it. Changes save right away.
- Your grid holds up to 9 apps. When it's full, uncheck one to make room for another. The last app can't be removed, so the grid is never empty.
- Drag apps in the **Your grid** preview to reorder them.
- Under **Appearance**, choose **Automatic** (match Firefox), **Light** or **Dark**. The popup and options page switch right away.
- **Restore defaults** brings back the original 9 apps and the Automatic theme.

## Supported apps

Google: Gmail, Google Calendar, Google Sheets, Google Drive, Google Gemini, Google Docs, Google Photos, Google Maps, Google Keep, Google Slides, Google Meet, Google Contacts, Google Classroom, Gemini Notebook, Google Translate, Google News, Google Messages, Google Voice, Google Groups, Google Play, YouTube, YouTube Music, Google Search, Google Chat, Google Forms, Google Sites, Google Tasks, Google Vids, Google Admin console, Google Account, Google Earth, Google Wallet, Google One, Google Home, Find Hub, Google Finance, Google Flights, Google Shopping, Google Scholar, Google Arts & Culture, Google Play Books, Blogger, YouTube Kids, YouTube TV, Google Fonts, Google Trends, Google Ads, Google Analytics, Google Search Console, Google Cloud console, Google Business Profile, Google AI Studio, Google Labs.

The default grid is Gmail, Calendar, Sheets, Drive, Gemini, Docs, Photos, Maps and Keep.

## Adding an app or a service

Every app lives in one file, [`src/apps.js`](src/apps.js).

**To add an app:**

1. Put its icon in `src/icons/<service>/`, for example `src/icons/google/drive.svg`. Both SVG and PNG work; PNGs should be at least 128×128. SVGs must be self-contained, with no links to outside files or fonts.
2. Add an entry to `APPS` in `src/apps.js`:
   ```js
   { id: "google-drive", service: "google", shortName: "Drive", name: "Google Drive", url: "https://drive.google.com/", icon: "icons/google/drive.svg" },
   ```
   - `id` is `<service>-<app>`, lowercase with dashes. **Never rename an ID once released**: it's what users' saved settings refer to.
   - `shortName` shows on the tile (about 10 characters fit). `name` is the full name, shown in tooltips and on the options page.
   - `url` is a plain `https://` address with no tracking parameters.
3. Run `npm run check` to catch mistakes.

**To add a service** (for example Proton): add it to `SERVICES` in `src/apps.js`, create `src/icons/<service>/`, then add its apps as above. The options page shows each service as its own section; no other code changes are needed.

## Development

You need [Node.js](https://nodejs.org/) (developed with v24) and Firefox 140 or later.

```bash
npm install
```

| Command | What it does |
|---|---|
| `npm start` | Opens a test Firefox with the add-on loaded; reloads when files change |
| `npm test` | Runs the unit tests |
| `npm run check` | Checks the app list for mistakes |
| `npm run check -- --release` | Same, and also fails if any app still uses the placeholder icon |
| `npm run lint` | Runs Mozilla's add-on checks (the same ones used for AMO review) |
| `npm run build` | Packages the add-on into `web-ext-artifacts/` for upload |

Only the `src/` folder ships in the add-on:

```
src/
├── manifest.json
├── apps.js          app list: every app, plus the defaults
├── settings.js      loads and saves your apps and theme (the only code that uses storage)
├── theme.js         applies the light, dark or automatic theme to a page
├── grid/            tiles and drag-to-reorder, shared by the popup and options page
├── popup/           the toolbar popup
├── options/         the options page
└── icons/           toolbar icons, and one folder of app icons per service
scripts/             dev-only: the app list check
tests/               dev-only: unit tests
```

## Support

If WaffleLauncher is useful to you, you can [buy me a coffee on Ko-fi](https://ko-fi.com/frye_jeff).

## Trademarks

Google, Gmail, YouTube and related product names and logos are trademarks of Google LLC. WaffleLauncher is an independent project and is not affiliated with or endorsed by Google, or by any other service it links to.

## License

[Mozilla Public License 2.0](LICENSE).
