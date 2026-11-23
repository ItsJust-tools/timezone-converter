# Timezone Converter

Convert a date and time between world timezones instantly with live offset info, DST awareness and comparison cards.

**Live:** [timezone-converter.itsjust.tools](https://timezone-converter.itsjust.tools)

## Features

- Pick a source and target timezone from a curated list of IANA zones
- Enter any date/time with the pickers, or one click on `Now`
- Converted time in the target timezone with full DST-aware correctness
- UTC offsets and active abbreviations (CET, EST, …) for both zones
- Side-by-side comparison cards with the time difference in hours/minutes
- Add extra zones to a comparison list to view one moment in many timezones
- Copy the converted ISO 8601 string to the clipboard
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- Selected zones and inputs persist locally across reloads
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action        |
| --- | ------------- |
| `N` | Use now       |
| `S` | Swap zones    |
| `Y` | Copy ISO 8601 |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-timezone-converter .
docker run -p 3000:3000 itsjust-timezone-converter
```

## License

MIT
