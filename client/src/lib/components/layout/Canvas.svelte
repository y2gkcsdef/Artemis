<script lang="ts">
  import type maplibregl from 'maplibre-gl'
  import Button from '$lib/components/base/Button.svelte'
  import MapCanvas from '$lib/components/map/Mapcanvas.svelte'
  import Timeline from '$lib/components/timeline/Timeline.svelte'
  import { syncMapCameras } from '$lib/components/layout/mapSync'
  import { compareEnabled, toggleCompare } from '$lib/stores/workspace'

  let leftMap = $state<maplibregl.Map | null>(null)
  let rightMap = $state<maplibregl.Map | null>(null)

  $effect(() => {
    if (!$compareEnabled || !leftMap || !rightMap) return

    return syncMapCameras(leftMap, rightMap)
  })
</script>

<main class="canvas">
  <div class="workspace-layer" class:is-compare={$compareEnabled}>
    <section class="workspace-pane workspace-pane-left" aria-label="Left workspace pane">
      <div class="pane-content">
        <MapCanvas
          side="left"
          onMapReady={map => (leftMap = map)}
          onMapDestroy={() => (leftMap = null)}
        />
      </div>
    </section>

    {#if $compareEnabled}
      <section class="workspace-pane workspace-pane-right" aria-label="Right workspace pane">
        <div class="pane-content">
          <MapCanvas
            side="right"
            onMapReady={map => (rightMap = map)}
            onMapDestroy={() => (rightMap = null)}
          />
        </div>
      </section>
    {/if}
  </div>

  <div class="overlay-layer">
    <div class="window-slot timeline-slot">
      <Timeline side="left" compareEnabled={$compareEnabled} />
    </div>

    <div class="window-slot compare-control-slot">
      <Button class="compare-button" aria-pressed={$compareEnabled} onclick={toggleCompare}>
        {$compareEnabled ? 'Close compare' : 'Compare'}
      </Button>
    </div>
  </div>
</main>

<style>
  .canvas {
    /* Controls */
    --canvas-control-left: 18px;
    --canvas-compare-button-bottom: 145px;

    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .workspace-layer,
  .overlay-layer {
    position: absolute;
    inset: 0;
  }

  .workspace-layer {
    overflow: hidden;
  }

  .overlay-layer {
    z-index: 2;
    pointer-events: none;
  }

  .workspace-pane {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .workspace-layer.is-compare .workspace-pane-left {
    right: 50%;
  }

  .workspace-pane-right {
    left: 50%;
  }

  .pane-content {
    position: absolute;
    inset: 0;
  }

  .window-slot {
    position: absolute;
  }

  .window-slot > :global(*) {
    pointer-events: auto;
  }

  .timeline-slot {
    left: 0;
    right: 0;
    bottom: 0;
  }

  .compare-control-slot {
    left: var(--canvas-control-left);
    bottom: var(--canvas-compare-button-bottom);
  }

  :global(.compare-button) {
    --button-height: 28px;
    --button-min-width: 82px;
    --button-padding-x: 12px;
  }
</style>
