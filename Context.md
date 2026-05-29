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
        │   ├── Canvas.svelte       # full app workspace composition
        │   └── mapSync.ts          # guarded camera sync between compare maps
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
    ├── iiifTileservers.js
    ├── layers.js
    ├── remoteServices.js
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
GET /api/iiif-tileservers/:sublayerId
```

`/api/layers` returns layer rows only. `/api/layers/:label/sublayers` returns sublayers separately. The frontend nests sublayers into layer state at initialization.

`/api/sublayers/resolve/:id` looks up `sublayer.id`, reads `type`, and returns the current hardcoded backing table mapping.

`/api/remote-services/:sublayerId` returns `remote_service` rows by `sublayer_id`.

`/api/iiif-tileservers/:sublayerId` returns `iiif_tileserver` rows by `sublayer_id`.

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
- For `iiif_tileserver`, render URLs come from `iiif_tileserver.tileserver_url`. Local XYZ tile roots are supported by the `iiifTileserver` renderer and expanded to `{z}/{x}/{y}.png` if the URL is a folder URL.
- Local Gereduceerd Kadaster tiles currently exist for zooms 8 through 17, so the `iiifTileserver` raster source constrains MapLibre requests to that tile pyramid range and the local tile coverage bounds. MapLibre's global map minimum zoom is also clamped to 8.

## Local Tile Serving
- Large local XYZ tile sets are served by a dedicated Nginx static tile server, not by the Express API.
- Tile root: `Tiles/`.
- Nginx config: `Tiles/nginx.conf`.
- Start script: `Tiles/start-tile-server.sh`.
- Rerunning the start script stops the previous Nginx instance for this prefix before starting a fresh one.
- Default local tile URL shape: `http://localhost:8080/<tile-folder>/{z}/{x}/{y}.png`.
- Example health check: `curl -I http://localhost:8080/Gereduceerd_Kadaster_tiles/14/8387/5472.png`.
- Start Nginx as the normal project user when serving tiles from `/home/def/...`; running it with `sudo` can make workers run as `nobody`, which cannot traverse the user's home directory.
- Missing Gereduceerd Kadaster `.png` tiles return Nginx `empty_gif` instead of 404 so irregular edge coverage does not surface as MapLibre tile errors.
- The Express server remains metadata/API only for this path. Do not add large tile folders to Express static middleware.

## Timeline State
`client/src/lib/stores/timeline.ts` owns shared timeline state:
- `layers`: fetched layers with nested sublayers.
- `timelineRange`: API range.
- `timelineLayers`: derived visual layer state with `track`, `visual_start_year`, `visual_end_year`.
- `leftCurrentYear` / `rightCurrentYear`: scrubber-selected years.
- `leftFocusedLayerLabel` / `rightFocusedLayerLabel`: user-focused visual layer after a timeline-layer click.
- `leftActiveLayers` / `rightActiveLayers`: derived from visual overlap, not historical range.
- `leftActiveSublayers` / `rightActiveSublayers`: default-visible sublayers from active layers, sorted by `sort_order`.
- `leftDeactivatedLayerLabels` / `rightDeactivatedLayerLabels`: visual layers suppressed because they overlap the focused layer.

Compatibility aliases (`currentYear`, `focusedLayerLabel`, `activeLayers`, `activeSublayers`, `deactivatedLayerLabels`) point to the left side.

Important: activation is **visual**. If the scrubber is over a rendered timeline block, that layer is active. Therefore timeline rendering and active-layer logic must use the same `timelineLayers` visual state.

Clicking a timeline layer focuses it, moves the target scrubber to that layer's visual center year, and suppresses overlapping visual layers. Clicking the timeline background or dragging a scrubber clears layer focus and restores normal activation for that side. In compare mode, layer clicks target the scrubber closest to the clicked layer's center year.

## Workspace/Layout State
`client/src/lib/stores/workspace.ts` owns canvas-level workspace state:
- `compareEnabled`: whether the workspace is in compare mode.
- `enableCompare()`, `disableCompare()`, `toggleCompare()`.

`client/src/lib/components/layout/Canvas.svelte` owns app-surface composition:
- The `workspace-layer` contains generic left/right workspace panes. These panes can contain MapLibre or other pane-specific content.
- The `overlay-layer` contains full-canvas UI such as the compare button and the timeline.
- The timeline intentionally lives in the overlay layer so it keeps full canvas width when compare mode splits the workspace panes.
- Compare mode uses one full-width timeline with two scrubbers: left scrubber controls left state/map, right scrubber controls right state/map.
- In compare mode, clicking the timeline background moves whichever scrubber is closest to the clicked year.
- When compare is enabled, the right scrubber initializes one year to the right of the left scrubber, clamped to the timeline range.
- Timeline layer popout/desaturation visuals combine left and right state while compare is enabled, so either scrubber can activate or focus a layer.

Compare mode direction:
- Use an explicit two-pane model: left state always exists, right state exists for compare.
- Shared timeline data remains global: `layers`, `timelineRange`, `timelineLayers`.
- Per-pane interaction state is explicit left/right state: current year, focused layer, active layers, active sublayers, deactivated labels.
- `Canvas.svelte` owns compare layout and map camera synchronization.
- Do not build around MapLibre's compare plugin; panes are generic and may contain non-map content later.

Compare view implementation:
1. Current single-view behavior is mapped to the left pane.
2. `timeline.ts` is split into shared data plus explicit left/right interaction state:
   - shared: `layers`, `timelineRange`, `timelineLayers`, `fetchLayers()`.
   - left/right: `currentYear`, `focusedLayerLabel`, `activeLayers`, `activeSublayers`, `deactivatedLayerLabels`.
3. Duplicate business logic is avoided through helper functions for visual overlap, active-layer derivation, deactivated-label derivation, and layer-focus center-year behavior.
4. Timeline actions are side-aware:
   - `focusTimelineLayer(side, layer)`.
   - `clearTimelineLayerFocus(side)`.
   - `setTimelineYear(side, year)`.
5. `Timeline.svelte` accepts a `side` prop, defaulting to `left`, and binds to that side's stores/actions.
6. `Mapcanvas.svelte` accepts a `side` prop, defaulting to `left`, and subscribes to that side's `activeSublayers`.
7. The right pane is rendered in `Canvas.svelte` only when `compareEnabled` is true.
8. When enabling compare, right-side timeline state is initialized from the left current year and right focus is cleared.
9. A second MapLibre canvas is mounted in the right workspace pane. `Mapcanvas.svelte` observes its container and calls `map.resize()` after layout changes.
10. Guarded map-camera synchronization lives in `client/src/lib/components/layout/mapSync.ts` and is wired by `Canvas.svelte` while both maps exist.
11. The visible compare timeline is a single full-width `Timeline` that renders a second `Scrubber` bound to right-side state when compare mode is enabled.

## Timeline UI
- `Timeline.svelte`: orchestrates axis, ticks, scrubber, layer blocks, and debug logging.
- `TimelineLayer.svelte`: renders one visual layer block, owns layer click/focus interaction and visual active/deactivated states. In compare mode, layer clicks focus the scrubber nearest the layer center.
- `Scrubber.svelte`: draggable year selector; updates the side-specific current year; dragging clears layer focus for that side.
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
IIIF tileserver renderer fetches /api/iiif-tileservers/:sublayerId and uses iiif_tileserver.tileserver_url
```

Do not make timeline components call MapLibre directly.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. Raster remote services use Belgium bounds to avoid out-of-coverage WMTS/WMS tile requests.

IIIF tileserver rendering is implemented for local XYZ-style tile roots. It fetches `iiif_tileserver.tileserver_url`, expands folder URLs to `{z}/{x}/{y}.png`, constrains Gereduceerd Kadaster requests to z8-z17 and the local tile coverage bounds, and removes the raster source/layer when inactive.

Parcel and toponym renderer modules are still stubs/loggers.

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
