# LinkGrove

Open-source, self-hosted **link-in-bio** platform with a tree-inspired name and a simple, durable setup.
 
The project combines:

- **LinkStack-style control**: admin UI, profile/theme editing, link management
- **LittleLink-style simplicity**: one JSON config, static export mode
- **Modern bio-link extras**: click analytics, CSV export, short slugs, QR code links, mobile/desktop routing, scheduled links

## Features

- Public bio page (`/`)
- Admin panel (`/admin`)
- Token-protected admin writes (`x-admin-token`)
- Dynamic redirects (`/go/:id`)
- Short links (`/s/:slug`)
- QR code endpoint per link (`/api/qr/:id`)
- Analytics JSON (`/api/analytics`) and CSV (`/api/analytics.csv`)
- Config bootstrap from `profile.config.json`
- Static export (`npm run export:static`)

## Quick start

```bash
npm install
cp .env.example .env
# set ADMIN_TOKEN in .env or environment
npm run start
```

Open:
- Bio page: `http://localhost:8787/`
- Admin: `http://localhost:8787/admin`

## Config mode (no admin required)

Edit `profile.config.json`, then:

```bash
npm run export:static
```

Output: `dist/index.html`

## Admin API

All admin endpoints require `x-admin-token` matching `ADMIN_TOKEN`.

- `POST /api/admin/profile`
- `POST /api/admin/theme`
- `POST /api/admin/link`
- `DELETE /api/admin/links/:id`

Example link payload:

```json
{
  "id": "github",
  "slug": "github",
  "title": "GitHub",
  "url": "https://github.com/aminamos",
  "description": "Code and experiments",
  "icon": "🐙",
  "order": 1,
  "active": true,
  "mobileUrl": "https://m.example.com",
  "desktopUrl": "https://www.example.com",
  "schedule": { "startHourUtc": 8, "endHourUtc": 20 }
}
```

## Docker

Build:

```bash
docker build -t openlinkhub .
```

Run:

```bash
docker run --rm -p 8787:8787 -e ADMIN_TOKEN=change-me openlinkhub
```

Optional env:
- `PORT` (default `8787`)
- `PUBLIC_BASE_URL` (used for QR destination links)

## Development and tests

```bash
npm run lint
npm run test
```

## License

MIT
