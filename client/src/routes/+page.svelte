<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchLayers } from '$lib/stores/timeline'
  import Canvas from '$lib/components/layout/Canvas.svelte'

  onMount(() => {
    fetchLayers()
  })
</script>

<Canvas />
