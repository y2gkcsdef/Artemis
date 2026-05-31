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
        ├── map/renderers/           # sublayer renderers plus renderer helpers
        ├── search/
        └── timeline/
            ├── Timeline.svelte
            ├── TimelineLayer.svelte
            ├── LayerMenu.svelte
            └── Scrubber.svelte

server/src/
├── index.js
├── sublayerTypes.js                # sublayer type -> backing table resolver
└── routes/
    ├── iiifTileservers.js
    ├── layers.js
    ├── geojson.js
    ├── remoteServices.js
    ├── search.js
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
GET /api/geojson/:dataset/:sublayerId
GET /api/remote-services/:sublayerId
GET /api/search?q=:query
GET /api/iiif-tileservers/:sublayerId
```

`/api/layers` returns layer rows only. `/api/layers/:label/sublayers` returns sublayers separately. The frontend nests sublayers into layer state at initialization.

`/api/sublayers/resolve/:id` looks up `sublayer.id`, reads `type`, and returns the current hardcoded backing table mapping.

`/api/geojson/:dataset/:sublayerId` returns GeoJSON FeatureCollections for whitelisted polygon-overlay datasets. Current datasets are `parcel` and `iiif-mask`.

`/api/remote-services/:sublayerId` returns `remote_service` rows by `sublayer_id`.

`/api/search?q=:query` searches IIIF manifest labels from `iiif_mask.label` and toponyms from `toponym.text`. Each result includes `layer_label` and `sublayer_label` source context.

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
- `parcel`: `id`, `sublayer_id`, `text`, `geometry`; geometry is EPSG:4326 `POLYGON`.
- `iiif_mask`: `id`, `iiif_tileserver_id`, `manifest`, `label`, `sprite_x`, `sprite_y`, `sprite_width`, `sprite_height`, `geometry`; geometry is EPSG:4326 `POLYGON`.
- There is no declared foreign key in the current database, but `iiif_mask.iiif_tileserver_id` relates to `iiif_tileserver.id`. The GeoJSON API resolves masks by joining through `iiif_tileserver.sublayer_id`.

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
- `leftSublayerVisibilityOverrides` / `rightSublayerVisibilityOverrides`: side-specific in-session user overrides keyed by `sublayer.id`.
- `leftActiveSublayers` / `rightActiveSublayers`: visible sublayers from active layers, sorted by `sort_order`; default state comes from `sublayer.default_visibility`, then side-specific overrides are applied.
- `leftDeactivatedLayerLabels` / `rightDeactivatedLayerLabels`: visual layers suppressed because they overlap the focused layer.

Compatibility aliases (`currentYear`, `focusedLayerLabel`, `activeLayers`, `activeSublayers`, `deactivatedLayerLabels`) point to the left side.

Important: activation is **visual**. If the scrubber is over a rendered timeline block, that layer is active. Therefore timeline rendering and active-layer logic must use the same `timelineLayers` visual state.

Clicking a timeline layer focuses it, moves the target scrubber to that layer's visual center year, and suppresses overlapping visual layers. Clicking the timeline background or dragging a scrubber clears layer focus and restores normal activation for that side. In compare mode, layer clicks target the scrubber closest to the clicked layer's center year.

## Workspace/Layout State
`client/src/lib/stores/workspace.ts` owns canvas-level workspace state:
- `workspaceSplitEnabled`: whether the workspace is split into left/right panes.
- `mapCompareEnabled`: whether the split is an active two-map compare with two timeline scrubbers.
- `leftPaneContent` / `rightPaneContent`: pane content descriptors, currently `map` or `iiif-viewer`.
- `iiifMaskWindows`: viewport windows opened from clicked IIIF mask polygons.
- `enableMapCompare()`, `disableMapCompare()`, `toggleCompare()`.
- `openIiifMaskWindow()`, `closeIiifMaskWindow()`.
- `viewIiifMask()`: opens split view with an IIIF viewer pane without enabling map compare.

`client/src/lib/components/layout/Canvas.svelte` owns app-surface composition:
- The `workspace-layer` contains generic left/right workspace panes. These panes can contain MapLibre or other pane-specific content.
- The `overlay-layer` contains full-canvas UI such as the compare button and the timeline.
- The timeline intentionally lives in the overlay layer so it keeps full canvas width when the workspace splits into two panes.
- Map compare mode uses one full-width timeline with two scrubbers: left scrubber controls left state/map, right scrubber controls right state/map.
- In map compare mode, clicking the timeline background moves whichever scrubber is closest to the clicked year.
- When map compare is enabled, the right scrubber initializes one year to the right of the left scrubber, clamped to the timeline range.
- Timeline layer popout/desaturation visuals combine left and right state while map compare is enabled, so either scrubber can activate or focus a layer.
- IIIF viewer split mode uses two workspace panes but keeps `mapCompareEnabled` false, so the timeline shows only one scrubber for the remaining map pane.

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
7. The right pane is rendered in `Canvas.svelte` only when `workspaceSplitEnabled` is true.
8. When enabling compare, right-side timeline state is initialized from the left current year and right focus is cleared.
9. A second MapLibre canvas is mounted in the right workspace pane. `Mapcanvas.svelte` observes its container and calls `map.resize()` after layout changes.
10. Guarded map-camera synchronization lives in `client/src/lib/components/layout/mapSync.ts` and is wired by `Canvas.svelte` while both maps exist.
11. The visible compare timeline is a single full-width `Timeline` that renders a second `Scrubber` bound to right-side state when map compare mode is enabled.

## Timeline UI
- `Timeline.svelte`: orchestrates axis, ticks, scrubber, layer blocks, and debug logging.
- `TimelineLayer.svelte`: renders one visual layer block, owns layer click/focus interaction and visual active/deactivated states. It also renders the attached sublayer-menu button. In compare mode, layer clicks focus the scrubber nearest the layer center.
- `LayerMenu.svelte`: timeline-owned popout menu rendered from a timeline layer. It uses `Window` and `Button`, shows layer metadata, and toggles sublayer visibility through side-specific timeline-store overrides. In compare mode it duplicates sublayer controls into left/right columns.
- `Scrubber.svelte`: draggable year selector; updates the side-specific current year; dragging clears layer focus for that side.
- `Window.svelte`: reusable base component for window chrome.
- `Button.svelte`: reusable base button primitive. Sizing is controlled by the placing component through CSS variables.

Temporary debug logs in `Mapcanvas.svelte` print the active sublayers passed to renderer reconciliation.

## Search UI
- Search components live in `client/src/lib/components/search/`.
- `SearchMenu.svelte` is rendered by `Canvas.svelte` in the top-center overlay slot.
- Search currently queries `/api/search` after two typed characters.
- Result types are `iiif_manifest` and `toponym`.
- Each result displays its label plus source context in the form `Layer / Sublayer`.
- Clicking a result always targets the left timeline/map: it focuses the result's layer, isolates it through timeline focus, and flies the left map to the result coordinates. IIIF manifest result coordinates come from the mask geometry centroid; toponym coordinates come from `toponym.lon` / `toponym.lat`.

## Map Rendering
Sublayer renderers live under `client/src/lib/components/map/renderers/`. Renderer helper modules live under `client/src/lib/components/map/renderers/helpers/`.

Current flow:
```txt
Scrubber -> currentYear store
currentYear -> activeLayers -> activeSublayers
Mapcanvas subscribes to activeSublayers after map load
Renderer manager resolves each sublayer via /api/sublayers/resolve/:id
Renderer registry dispatches by resolved sublayer.type
Remote service renderer fetches /api/remote-services/:sublayerId and uses remote_service.endpoint
IIIF tileserver renderer fetches /api/iiif-tileservers/:sublayerId and uses iiif_tileserver.tileserver_url
Parcel renderer fetches /api/geojson/parcel/:sublayerId and renders polygon fill/line layers
IIIF mask renderer fetches /api/geojson/iiif-mask/:sublayerId and renders hover-only polygon outlines
```

Do not make timeline components call MapLibre directly.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. Raster remote services use Belgium bounds to avoid out-of-coverage WMTS/WMS tile requests.

IIIF tileserver rendering is implemented for local XYZ-style tile roots. It fetches `iiif_tileserver.tileserver_url`, expands folder URLs to `{z}/{x}/{y}.png`, constrains Gereduceerd Kadaster requests to z8-z17 and the local tile coverage bounds, and removes raster sources/layers when inactive.

Parcel rendering is implemented for EPSG:4326 polygon GeoJSON served by Express from the `parcel` dataset. It renders a translucent fill and parcel boundary line, and removes both layers/source when inactive.

IIIF mask rendering is implemented as a companion to the IIIF tileserver renderer. It fetches EPSG:4326 polygon GeoJSON from the `iiif-mask` dataset, adds an invisible fill hit-test layer, and shows only the hovered mask boundary so users can see the mask is clickable. Clicking a mask opens a viewport window with the manifest label, a cropped sprite-sheet preview, and a View button.

IIIF mask preview windows are rendered by `client/src/lib/components/map/IiifMaskWindow.svelte` from state in `workspace.ts`. Current reduced-cadastre masks use `/gereduceerd_sprites.jpg`; primitive-cadastre support is mapped to `/primitief_sprites.jpg` for future rows. The crop coordinates come from `iiif_mask.sprite_x`, `sprite_y`, `sprite_width`, and `sprite_height`; the static sprite JSON metadata is not needed at runtime. Pressing View opens `client/src/lib/components/iiif/IiifViewer.svelte` in the opposite workspace pane and disables map compare so no second timeline scrubber is added.

Toponym renderer is still a stub/logger.

Shared always-visible GeoJSON polygon rendering for parcel-style layers lives in `client/src/lib/components/map/renderers/geojsonOverlay.ts`. IIIF mask hover rendering lives separately in `client/src/lib/components/map/renderers/iiifMask.ts`.

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
- No vector tile server for parcels/toponyms for now; serve GeoJSON from Express.
- Runtime type resolution is hardcoded for now; cache/config support can be added later.
- Heavy render data should be fetched only when needed, not during timeline init.

## Current Todos
- Implement the toponym API and renderer.
- Remove temporary map-boundary active-sublayer debug logging once renderer work stabilizes.
