<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import maplibregl from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'

  let mapContainer: HTMLDivElement
  let map: maplibregl.Map

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
  })

  onDestroy(() => {
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
