<script lang="ts">
  import type maplibregl from 'maplibre-gl'
  import Button from '$lib/components/base/Button.svelte'
  import IiifViewer from '$lib/components/iiif/IiifViewer.svelte'
  import IiifMaskWindow from '$lib/components/map/IiifMaskWindow.svelte'
  import MapCanvas from '$lib/components/map/Mapcanvas.svelte'
  import SearchMenu from '$lib/components/search/SearchMenu.svelte'
  import Timeline from '$lib/components/timeline/Timeline.svelte'
  import { syncMapCameras } from '$lib/components/layout/mapSync'
  import {
    iiifMaskWindows,
    iiifViewerOverlay,
    leftPaneContent,
    mapCompareEnabled,
    rightPaneContent,
    toggleCompare,
    workspaceSplitEnabled
  } from '$lib/stores/workspace'

  let leftMap = $state<maplibregl.Map | null>(null)
  let rightMap = $state<maplibregl.Map | null>(null)
  const timelineSide = $derived($leftPaneContent.kind === 'map' ? 'left' : 'right')

  $effect(() => {
    if (!$mapCompareEnabled || !leftMap || !rightMap) return

    return syncMapCameras(leftMap, rightMap)
  })
</script>

<main class="canvas">
  <div class="workspace-layer" class:is-compare={$workspaceSplitEnabled}>
    <section class="workspace-pane workspace-pane-left" aria-label="Left workspace pane">
      <div class="pane-content">
        {#if $leftPaneContent.kind === 'map'}
          <MapCanvas
            side="left"
            onMapReady={map => (leftMap = map)}
            onMapDestroy={() => (leftMap = null)}
          />
        {:else}
          <IiifViewer side="left" manifest={$leftPaneContent.manifest} label={$leftPaneContent.label} />
        {/if}
        {#if $iiifViewerOverlay?.side === 'left'}
          <IiifViewer
            side="left"
            manifest={$iiifViewerOverlay.manifest}
            label={$iiifViewerOverlay.label}
          />
        {/if}
      </div>
    </section>

    {#if $workspaceSplitEnabled}
      <section class="workspace-pane workspace-pane-right" aria-label="Right workspace pane">
        <div class="pane-content">
          {#if $rightPaneContent.kind === 'map'}
            <MapCanvas
              side="right"
              onMapReady={map => (rightMap = map)}
              onMapDestroy={() => (rightMap = null)}
            />
          {:else}
            <IiifViewer side="right" manifest={$rightPaneContent.manifest} label={$rightPaneContent.label} />
          {/if}
          {#if $iiifViewerOverlay?.side === 'right'}
            <IiifViewer
              side="right"
              manifest={$iiifViewerOverlay.manifest}
              label={$iiifViewerOverlay.label}
            />
          {/if}
        </div>
      </section>
    {/if}
  </div>

  <div class="overlay-layer">
    <div class="window-slot search-slot">
      <SearchMenu />
    </div>

    <div class="window-slot timeline-slot">
      <Timeline side={timelineSide} compareEnabled={$mapCompareEnabled} />
    </div>

    <div class="window-slot compare-control-slot">
      <Button class="compare-button" aria-pressed={$mapCompareEnabled} onclick={toggleCompare}>
        {$mapCompareEnabled ? 'Close compare' : 'Compare'}
      </Button>
    </div>

    {#each $iiifMaskWindows as mask (mask.id)}
      <IiifMaskWindow {mask} />
    {/each}
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

  .search-slot {
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
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
