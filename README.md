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
├── server/   # Express API
└── Tiles/    # local XYZ tile folders and Nginx tile server config
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

Start the local tile server when working with local XYZ tile sets:

```bash
cd Tiles
./start-tile-server.sh
```

Rerunning this script gracefully stops the previous tile-server instance for the same Nginx prefix before starting the new one, so config changes can be picked up without manually finding the process.

Default URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Local tiles: `http://localhost:8080`

Large local tile folders are served by Nginx from `Tiles/`, not by the Express API. The URL shape is:

```txt
http://localhost:8080/<tile-folder>/{z}/{x}/{y}.png
```

Example tile check:

```bash
curl -I http://localhost:8080/Gereduceerd_Kadaster_tiles/14/8387/5472.png
```

For Gereduceerd Kadaster, missing `.png` tiles at irregular coverage edges return Nginx `empty_gif` instead of 404, so MapLibre can treat them as empty raster tiles.

## API

```txt
GET /health
GET /api/layers
GET /api/layers/range
GET /api/layers/:label/sublayers
GET /api/sublayers/resolve/:id
GET /api/remote-services/:sublayerId
GET /api/iiif-tileservers/:sublayerId
```

Examples:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/layers
curl "http://localhost:3000/api/layers/Gereduceerd%20Kadaster/sublayers"
curl http://localhost:3000/api/sublayers/resolve/12
curl http://localhost:3000/api/remote-services/1
curl http://localhost:3000/api/iiif-tileservers/12
```

## Timeline Architecture

The timeline store fetches layers and sublayers, then derives:

- left/right `currentYear`
- left/right `focusedLayerLabel`
- `timelineLayers`
- left/right `activeLayers`
- left/right `activeSublayers`
- left/right `deactivatedLayerLabels`

Layer activation is based on the visual timeline block, not only the historical start/end years. This keeps scrubber behavior aligned with what the user sees.

Clicking a timeline layer moves the target scrubber to that layer's visual center year and focuses it. Layers that visually overlap the focused layer are suppressed and desaturated. Clicking the timeline background or dragging a scrubber clears that side's focus.

The scrubber only updates `currentYear`. `Mapcanvas` subscribes to `activeSublayers`, resolves each sublayer through the API, and dispatches to renderer modules by `sublayer.type`.

Renderer modules live in:

```txt
client/src/lib/components/map/renderers/
```

The renderer manager resolves active sublayers through `/api/sublayers/resolve/:id`, dispatches by `sublayer.type`, and removes inactive rendered sources/layers during reconciliation.

Remote service rendering is implemented for `wmts`, `wms`, and best-effort GeoJSON `wfs`. It reads the actual service URL from `remote_service.endpoint`.

IIIF tileserver rendering reads `iiif_tileserver.tileserver_url`. Local XYZ tile roots such as `http://localhost:8080/Gereduceerd_Kadaster_tiles/` are expanded by the renderer to `{z}/{x}/{y}.png`. The local Gereduceerd Kadaster tile source is constrained to zooms 8 through 17 and local tile coverage bounds to avoid requests outside the dataset. The global map minimum zoom is clamped to 8.

Raster remote services are bounded to the Belgium/Scheldt working extent to avoid MapLibre requesting out-of-coverage WMTS/WMS tiles from providers that return HTTP 400 instead of empty tiles.

Parcel and toponym renderers are still stubs/loggers.

## Canvas And Compare Direction

`client/src/lib/components/layout/Canvas.svelte` owns the app workspace composition. The current route fetches timeline data and renders `Canvas`.

The canvas has two top-level layout layers:

- `workspace-layer`: generic left/right workspace panes. The left pane currently contains the MapLibre map. The right pane is rendered when compare mode is enabled.
- `overlay-layer`: full-canvas UI, including the compare button and the full-width timeline.

Compare mode is controlled by `client/src/lib/stores/workspace.ts` through `compareEnabled` and `toggleCompare()`.

Compare architecture:

- Commit to two panes only: left and right.
- Shared data remains global: layers, timeline range, visual timeline layers.
- Per-pane interaction state is explicit left/right state: current year, focused layer, active layers, active sublayers, and deactivated labels.
- `Timeline.svelte` and `Mapcanvas.svelte` accept a `side` prop and default to `left`.
- Compare mode keeps one full-width timeline and adds a second scrubber for right-side state.
- Timeline background and layer clicks move the nearest scrubber when compare mode is active.
- The right scrubber initializes one year to the right of the left scrubber when compare is enabled.
- Timeline layer popout and desaturation visuals respond to both scrubbers in compare mode.
- `Canvas.svelte` owns compare layout and wires map camera synchronization through `components/layout/mapSync.ts`.
- Do not use MapLibre's compare plugin as the app abstraction; panes are generic and may later hold non-map content.

Single-view compatibility aliases in `timeline.ts` point to the left side. New timeline/map code should prefer explicit side-aware stores and actions.

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
