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

  function createBaseMapStyle(backgroundColor: string): maplibregl.StyleSpecification {
    return {
      version: 8,
      sources: {
        baselayer: {
          type: 'geojson',
          data: '/baselayer.geojson'
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': backgroundColor
          }
        },
        {
          id: 'baselayer-fill',
          type: 'fill',
          source: 'baselayer',
          filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
          paint: {
            'fill-color': '#4f8fd8',
            'fill-opacity': 0.72
          }
        },
        {
          id: 'baselayer-line',
          type: 'line',
          source: 'baselayer',
          filter: [
            'in',
            ['geometry-type'],
            ['literal', ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']]
          ],
          paint: {
            'line-color': '#9aa58d',
            'line-opacity': 0.75,
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 13, 1.2, 17, 2.4]
          }
        },
        {
          id: 'baselayer-point',
          type: 'circle',
          source: 'baselayer',
          filter: ['in', ['geometry-type'], ['literal', ['Point', 'MultiPoint']]],
          paint: {
            'circle-color': '#9aa58d',
            'circle-opacity': 0.8,
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 5]
          }
        }
      ]
    }
  }

  onMount(() => {
    const backgroundColor = getComputedStyle(mapContainer)
      .getPropertyValue('--map-background-color')
      .trim()

    map = new maplibregl.Map({
      container: mapContainer,
      style: createBaseMapStyle(backgroundColor),
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
