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
├── routes/+page.svelte             # fetches timeline data, renders layout canvas
└── lib/
    ├── stores/timeline.ts          # layer data, currentYear, visual timeline state
    ├── stores/workspace.ts         # canvas/workspace state, e.g. compare mode
    └── components/
        ├── base/
        │   ├── Button.svelte
        │   └── Window.svelte
        ├── layout/
        │   └── Canvas.svelte       # full app workspace composition
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
- `focusedLayerLabel`: user-focused visual layer after a timeline-layer click.
- `timelineLayers`: derived visual layer state with `track`, `visual_start_year`, `visual_end_year`.
- `activeLayers`: derived from visual overlap, not historical range.
- `activeSublayers`: default-visible sublayers from active layers, sorted by `sort_order`.
- `deactivatedLayerLabels`: visual layers suppressed because they overlap the focused layer.

Important: activation is **visual**. If the scrubber is over a rendered timeline block, that layer is active. Therefore timeline rendering and active-layer logic must use the same `timelineLayers` visual state.

Clicking a timeline layer focuses it, moves the scrubber to that layer's visual center year, and suppresses overlapping visual layers. Clicking the timeline background or dragging the scrubber clears layer focus and restores normal activation.

## Workspace/Layout State
`client/src/lib/stores/workspace.ts` owns canvas-level workspace state:
- `compareEnabled`: whether the workspace is in compare mode.
- `enableCompare()`, `disableCompare()`, `toggleCompare()`.

`client/src/lib/components/layout/Canvas.svelte` owns app-surface composition:
- The `workspace-layer` contains generic left/right workspace panes. These panes can contain MapLibre or other pane-specific content.
- The `overlay-layer` contains full-canvas UI such as the compare button and the timeline.
- The timeline intentionally lives in the overlay layer so it keeps full canvas width when compare mode splits the workspace panes.

Compare mode direction:
- Use an explicit two-pane model: left state always exists, right state will be added for compare.
- Shared timeline data remains global: `layers`, `timelineRange`, `timelineLayers`.
- Per-pane interaction state will become explicit left/right state: current year, focused layer, active layers, active sublayers, deactivated labels.
- `Canvas.svelte` should own compare layout and, later, map camera synchronization.
- Do not build around MapLibre's compare plugin; panes are generic and may contain non-map content later.

## Timeline UI
- `Timeline.svelte`: orchestrates axis, ticks, scrubber, layer blocks, and debug logging.
- `TimelineLayer.svelte`: renders one visual layer block, owns layer click/focus interaction and visual active/deactivated states.
- `Scrubber.svelte`: draggable year selector; updates `currentYear`; dragging clears layer focus.
- `Window.svelte`: reusable base component for window chrome.
- `Button.svelte`: reusable base button primitive. Sizing is controlled by the placing component through CSS variables.

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

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. Raster remote services use Belgium bounds to avoid out-of-coverage WMTS/WMS tile requests. Other renderer modules are stubs/loggers.

## Design Notes
- Global CSS is only tokens/reset/body defaults.
- Component-specific styling stays inside that component.
- Reusable primitives go in `components/base`.
- Layout/composition components go in `components/layout`.
- Feature-owned components go in `components/<feature>`.
- Visual rounding is controlled by global `--control-corner-ratio`.
- Window colors/border/shadow are local to `Window.svelte`; window radius derives from `--control-corner-ratio`.
- Canvas-level spacing and control placement live in `Canvas.svelte`.

## Key Decisions
- No Allmaps.
- No vector tile server for parcels/toponyms; serve GeoJSON from Express later.
- Runtime type resolution is hardcoded for now; cache/config support can be added later.
- Heavy render data should be fetched only when needed, not during timeline init.
