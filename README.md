# 歸化考試

Practice app for the **Taiwan (R.O.C.) naturalization exam** (歸化測試).

256 official multiple-choice questions ([source PDF](https://www.ris.gov.tw/documents/data/8/3/0f9dda6b-0dda-4644-90fb-101515d8aab9.pdf)) served 20 at a time through a lightweight Next.js quiz UI. Progress is tracked in `localStorage` so you can close the tab and pick up where you left off.

## Features

- **Smart question selection** — prioritizes unseen questions and past mistakes so you focus where it matters.
- **Errors-only mode** — drill just the questions you previously got wrong.
- **Per-question stats** — see seen/correct/error counts for every question on the `/stats` page.
- **Dark / light / system theme** with one-click toggle.
- **No account required** — everything stays in your browser.

## Quick start

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Requires Node.js 18+.

## Project structure

```
parse.py            # Python script to parse raw exam text into questions.json
questions.json      # 256 parsed questions (JSON)
web/                # Next.js app
  app/
    page.tsx        # Quiz UI
    stats/page.tsx  # Per-question statistics
    api/            # API routes serving questions from questions.json
  lib/
    stats.ts        # localStorage stats helpers
    theme.ts        # Theme management
  types.ts          # Shared TypeScript types
```

## Updating the question bank

If you have a new raw exam text file, regenerate `questions.json` with the parser:

```bash
python3 parse.py <input-file> -o questions.json
```

## License

This project is dual-licensed:

- **[AGPL-3.0](LICENSE)** for open-source use.
- **Commercial license** available for organizations that need to deploy without AGPL obligations. Contact TODO for details.

The exam questions themselves are published by Taiwan's [National Immigration Agency](https://www.ris.gov.tw/) and are not covered by this license.
