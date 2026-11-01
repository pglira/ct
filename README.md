# CalTrack

A Progressive Web App that tracks the calories that you eat in one day.

- Add an entry from the food list with the grams, or add an entry with a custom kcal value.
- Tap an entry in the quick add row to add it again with one tap. The row shows the favorite entries first, then the most frequent entries. Tap the star at the start of the row to mark entries as favorites. Clearing the day does not change the row.
- In the new entry sheet, the most used foods come first. A tap on a food fills in the grams of its last entry, so that Save adds the entry.
- Enter all numbers with the keypad of the app. The system keyboard does not open.
- See the eaten and the remaining calories of the day against the daily limit.
- Tap an entry to edit it. Swipe an entry to the left to show Edit and Delete.
- Keep a food list with the kcal per 100 g of each food. Tap the star of a food to make it a favorite. Favorite foods come first in the lists. Export the list to a JSON file and import it again.
- The entries of each day are stored separately, so each new day starts empty.

## Tech

- React, TypeScript and Vite
- `vite-plugin-pwa` for the manifest, the service worker and the offline cache
- `localStorage` for the data

## Development

```bash
npm install
npm run dev
```

## Deployment

Vercel builds the app and publishes it on each push to `main`. The app is served at `https://ct-flax.vercel.app`.

## Install on iOS

Open the URL in Safari, tap Share and select "Add to Home Screen".
