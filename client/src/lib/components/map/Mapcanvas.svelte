<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'
  import maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { getActiveSublayersStore, type TimelineSide } from '$lib/stores/timeline'
  import { clearIiifMaskWindows, mapFocusRequest } from '$lib/stores/workspace'
  import { createRendererManager } from '$lib/components/map/renderers/manager'

  const { side = 'left', onMapReady, onMapDestroy } = $props<{
    side?: TimelineSide
    onMapReady?: (map: maplibregl.Map) => void
    onMapDestroy?: (map: maplibregl.Map) => void
  }>()

  // svelte-ignore state_referenced_locally
  const activeSublayers = getActiveSublayersStore(side)
  let mapContainer: HTMLDivElement
  let map: maplibregl.Map
  let resizeObserver: ResizeObserver | undefined
  let unsubscribeActiveSublayers: Unsubscriber | undefined
  let unsubscribeMapFocusRequest: Unsubscriber | undefined
  let rendererManager: ReturnType<typeof createRendererManager> | undefined

  onMount(() => {
    map = new maplibregl.Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: [4.0, 51.0], // Belgium
      zoom: 9,
      minZoom: 8,
      attributionControl: false
    })
    onMapReady?.(map)

    map.on('load', () => {
      rendererManager = createRendererManager(map, side)
      unsubscribeActiveSublayers = activeSublayers.subscribe($activeSublayers => {
        const activeSublayerSummary = $activeSublayers
          .map(
            sublayer =>
              `${sublayer.id}:${sublayer.type}:${sublayer.layer_label}/${sublayer.label}:default=${sublayer.default_visibility}:sort=${sublayer.sort_order}`
          )
          .join(' | ')

        console.log(`[map:${side}] reconcile active sublayers: ${activeSublayerSummary || 'none'}`)

        rendererManager?.reconcile($activeSublayers).catch(err => {
          console.error('[map-renderer] failed to reconcile active sublayers', err)
        })
      })
    })

    unsubscribeMapFocusRequest = mapFocusRequest.subscribe(request => {
      if (!request || request.side !== side || !map.loaded()) return

      map.flyTo({
        center: [request.lon, request.lat],
        zoom: request.zoom,
        essential: true
      })
    })

    map.on('dragstart', clearIiifMaskWindows)
    map.on('zoomstart', clearIiifMaskWindows)

    resizeObserver = new ResizeObserver(() => {
      map.resize()
    })
    resizeObserver.observe(mapContainer)
  })

  onDestroy(() => {
    if (map) {
      onMapDestroy?.(map)
    }
    resizeObserver?.disconnect()
    unsubscribeActiveSublayers?.()
    unsubscribeMapFocusRequest?.()
    rendererManager?.clear().catch(err => {
      console.error('[map-renderer] failed to clear rendered sublayers', err)
    })
    map?.off('dragstart', clearIiifMaskWindows)
    map?.off('zoomstart', clearIiifMaskWindows)
    map?.remove()
  })
</script>

<div bind:this={mapContainer} class="map-canvas"></div>

<style>
  .map-canvas {
    width: 100%;
    height: 100%;
  }
</style>
