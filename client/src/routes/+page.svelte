<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchLayers } from '$lib/stores/timeline'
  import Timeline from '$lib/components/timeline/Timeline.svelte'
  import MapCanvas from '$lib/components/map/Mapcanvas.svelte'

  onMount(() => {
    fetchLayers()
  })
</script>

<main>
  <MapCanvas />
  <Timeline />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }
</style>
