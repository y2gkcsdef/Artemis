# Artemis Context

Artemis is a historical map viewer for the Scheldt/Schelde region. Public name: **Schelde Gemapt**.

## Stack
- Monorepo: `client/` SvelteKit + MapLibre, `server/` Express + `pg`.
- Frontend dev URL: `http://localhost:5173`.
- API URL: `http://localhost:3000`.
- Database: PostgreSQL/PostGIS, DB `Artemis`, read user `artemis_reader`.
- Geometry is stored in EPSG:4326. XYZ tiles are served as EPSG:3857.
- No ORM. Server uses raw SQL.

## Current Structure
```txt
client/src/
├── app.css                         # global tokens, reset, body font
├── routes/+layout.svelte           # imports app.css
├── routes/+page.svelte             # fetches timeline data, renders map + timeline
└── lib/
    ├── stores/timeline.ts          # layers, currentYear, visual timeline state
    └── components/
        ├── base/Window.svelte
        ├── map/Mapcanvas.svelte
        ├── map/renderers/           # renderer manager, registry, type handlers
        └── timeline/
            ├── Timeline.svelte
            ├── TimelineLayer.svelte
            └── Scrubber.svelte

server/src/
├── index.js
├── sublayerTypes.js                # sublayer type -> backing table resolver
└── routes/
    ├── layers.js
    └── sublayers.js
```

## API
Base URL: `http://localhost:3000`

```txt
GET /health
GET /api/layers
GET /api/layers/range
GET /api/layers/:label/sublayers
GET /api/sublayers/resolve/:id
GET /api/remote-services/:sublayerId
STATIC /tiles/*
```

`/api/layers` returns layer rows only. `/api/layers/:label/sublayers` returns sublayers separately. The frontend nests sublayers into layer state at initialization.

`/api/sublayers/resolve/:id` looks up `sublayer.id`, reads `type`, and returns the current hardcoded backing table mapping.

`/api/remote-services/:sublayerId` returns `remote_service` rows by `sublayer_id`.

## Data Model
- `layer`: `label`, `start_year`, `end_year`.
- `sublayer`: `id`, `layer_label`, `label`, `type`, `source`, `default_visibility`, `sort_order`.
- `sublayer.type`: `wmts`, `wms`, `wfs`, `iiif_tileserver`, `parcel`, `toponym`.
- Type resolver:
  - `wmts`, `wms`, `wfs` -> `remote_service`
  - `iiif_tileserver` -> `iiif_tileserver`
  - `parcel` -> `parcel`
  - `toponym` -> `toponym`
- Type-specific tables use `sublayer_id = sublayer.id`.
- For `remote_service`, render URLs come from `remote_service.endpoint`; `sublayer.source` is provider metadata.

## Timeline State
`client/src/lib/stores/timeline.ts` owns shared timeline state:
- `layers`: fetched layers with nested sublayers.
- `timelineRange`: API range.
- `currentYear`: scrubber-selected year.
- `timelineLayers`: derived visual layer state with `track`, `visual_start_year`, `visual_end_year`.
- `activeLayers`: derived from visual overlap, not historical range.
- `activeSublayers`: default-visible sublayers from active layers, sorted by `sort_order`.

Important: activation is **visual**. If the scrubber is over a rendered timeline block, that layer is active. Therefore timeline rendering and active-layer logic must use the same `timelineLayers` visual state.

## Timeline UI
- `Timeline.svelte`: orchestrates axis, ticks, scrubber, layer blocks, and debug logging.
- `TimelineLayer.svelte`: renders one visual layer block.
- `Scrubber.svelte`: draggable year selector; updates `currentYear`.
- `Window.svelte`: reusable base component for window chrome.

Temporary debug logs in `Timeline.svelte` print active layers and default sublayers when scrubber state changes.

## Map Rendering
Renderers live under `client/src/lib/components/map/renderers/`.

Current flow:
```txt
Scrubber -> currentYear store
currentYear -> activeLayers -> activeSublayers
Mapcanvas subscribes to activeSublayers after map load
Renderer manager resolves each sublayer via /api/sublayers/resolve/:id
Renderer registry dispatches by resolved sublayer.type
Remote service renderer fetches /api/remote-services/:sublayerId and uses remote_service.endpoint
```

Do not make timeline components call MapLibre directly.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. Other renderer modules are stubs/loggers.

## Design Notes
- Global CSS is only tokens/reset/body defaults.
- Component-specific styling stays inside that component.
- Reusable primitives go in `components/base`.
- Feature-owned components go in `components/<feature>`.
- Radius tokens are global because visual rounding must stay consistent.
- Window colors/border/shadow are local to `Window.svelte`; window radius uses global `--radius-window`.

## Key Decisions
- No Allmaps.
- No vector tile server for parcels/toponyms; serve GeoJSON from Express later.
- Runtime type resolution is hardcoded for now; cache/config support can be added later.
- Heavy render data should be fetched only when needed, not during timeline init.
