# Artemis

Artemis is a historical map viewer for the Scheldt/Schelde region. The public-facing name is **Schelde Gemapt**.

## Stack

- Frontend: SvelteKit, Svelte 5, MapLibre GL, vanilla CSS
- Backend: Express, Node.js ESM, `pg`, PostgreSQL/PostGIS
- Package manager: pnpm

## Project Structure

```txt
Artemis/
├── client/   # SvelteKit app
└── server/   # Express API
```

Frontend components are grouped by ownership:

```txt
client/src/lib/components/
├── base/       # reusable primitives, e.g. Window
├── map/        # MapLibre map components
│   └── renderers/
└── timeline/   # timeline-owned components
```

Timeline state lives in:

```txt
client/src/lib/stores/timeline.ts
```

## Development

Start the API:

```bash
cd server
pnpm install
node src/index.js
```

Start the frontend:

```bash
cd client
pnpm install
pnpm dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## API

```txt
GET /health
GET /api/layers
GET /api/layers/range
GET /api/layers/:label/sublayers
GET /api/sublayers/resolve/:id
GET /api/remote-services/:sublayerId
```

Examples:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/layers
curl "http://localhost:3000/api/layers/Gereduceerd%20Kadaster/sublayers"
curl http://localhost:3000/api/sublayers/resolve/12
curl http://localhost:3000/api/remote-services/1
```

## Timeline Architecture

The timeline store fetches layers and sublayers, then derives:

- `currentYear`
- `timelineLayers`
- `activeLayers`
- `activeSublayers`

Layer activation is based on the visual timeline block, not only the historical start/end years. This keeps scrubber behavior aligned with what the user sees.

The scrubber only updates `currentYear`. `Mapcanvas` subscribes to `activeSublayers`, resolves each sublayer through the API, and dispatches to renderer modules by `sublayer.type`.

Renderer modules live in:

```txt
client/src/lib/components/map/renderers/
```

They are currently wired as stubs/loggers so type-specific MapLibre logic can be added incrementally.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. It reads the actual service URL from `remote_service.endpoint`.

## Sublayer Types

Sublayer type resolution currently maps:

```txt
wmts / wms / wfs -> remote_service
iiif_tileserver -> iiif_tileserver
parcel          -> parcel
toponym         -> toponym
```

This mapping is hardcoded in `server/src/sublayerTypes.js` for now.

## Checks

Frontend type check:

```bash
cd client
pnpm check
```
