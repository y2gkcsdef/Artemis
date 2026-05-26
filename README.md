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
├── base/       # reusable primitives, e.g. Window and Button
├── layout/     # app/workspace composition, e.g. Canvas
├── map/        # MapLibre map components
│   └── renderers/
└── timeline/   # timeline-owned components
```

Timeline state lives in:

```txt
client/src/lib/stores/timeline.ts
```

Workspace/canvas state lives in:

```txt
client/src/lib/stores/workspace.ts
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
- `focusedLayerLabel`
- `timelineLayers`
- `activeLayers`
- `activeSublayers`
- `deactivatedLayerLabels`

Layer activation is based on the visual timeline block, not only the historical start/end years. This keeps scrubber behavior aligned with what the user sees.

Clicking a timeline layer moves the scrubber to that layer's visual center year and focuses it. Layers that visually overlap the focused layer are suppressed and desaturated. Clicking the timeline background or dragging the scrubber clears that focus.

The scrubber only updates `currentYear`. `Mapcanvas` subscribes to `activeSublayers`, resolves each sublayer through the API, and dispatches to renderer modules by `sublayer.type`.

Renderer modules live in:

```txt
client/src/lib/components/map/renderers/
```

They are currently wired as stubs/loggers so type-specific MapLibre logic can be added incrementally.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. It reads the actual service URL from `remote_service.endpoint`.

Raster remote services are bounded to the Belgium/Scheldt working extent to avoid MapLibre requesting out-of-coverage WMTS/WMS tiles from providers that return HTTP 400 instead of empty tiles.

## Canvas And Compare Direction

`client/src/lib/components/layout/Canvas.svelte` owns the app workspace composition. The current route fetches timeline data and renders `Canvas`.

The canvas has two top-level layout layers:

- `workspace-layer`: generic left/right workspace panes. The left pane currently contains the MapLibre map. The right pane is rendered when compare mode is enabled.
- `overlay-layer`: full-canvas UI, including the compare button and the full-width timeline.

Compare mode is controlled by `client/src/lib/stores/workspace.ts` through `compareEnabled` and `toggleCompare()`.

Planned compare architecture:

- Commit to two panes only: left and right.
- Shared data remains global: layers, timeline range, visual timeline layers.
- Per-pane interaction state will become explicit left/right state: current year, focused layer, active layers, active sublayers, and deactivated labels.
- `Canvas.svelte` will own compare layout and map camera synchronization.
- Do not use MapLibre's compare plugin as the app abstraction; panes are generic and may later hold non-map content.

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
