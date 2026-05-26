<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { Unsubscriber } from 'svelte/store'
  import maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { activeSublayers } from '$lib/stores/timeline'
  import { createRendererManager } from '$lib/components/map/renderers/manager'

  let mapContainer: HTMLDivElement
  let map: maplibregl.Map
  let unsubscribeActiveSublayers: Unsubscriber | undefined
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
      attributionControl: false
    })

    map.on('load', () => {
      rendererManager = createRendererManager(map)
      unsubscribeActiveSublayers = activeSublayers.subscribe($activeSublayers => {
        rendererManager?.reconcile($activeSublayers).catch(err => {
          console.error('[map-renderer] failed to reconcile active sublayers', err)
        })
      })
    })
  })

  onDestroy(() => {
    unsubscribeActiveSublayers?.()
    rendererManager?.clear().catch(err => {
      console.error('[map-renderer] failed to clear rendered sublayers', err)
    })
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
