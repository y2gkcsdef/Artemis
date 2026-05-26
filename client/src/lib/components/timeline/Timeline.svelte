<script lang="ts">
  import { onDestroy } from 'svelte'
  import { derived } from 'svelte/store'
  import {
    activeLayers,
    activeSublayers,
    currentYear,
    layers,
    timelineLayers,
    timelineRange,
    TIMELINE_MAX_TRACKS
  } from '$lib/stores/timeline'
  import Window from '$lib/components/base/Window.svelte'
  import Scrubber from '$lib/components/timeline/Scrubber.svelte'
  import TimelineLayer from '$lib/components/timeline/TimelineLayer.svelte'

  const TRACK_HEIGHT = 26
  const BASE_HEIGHT = 24

  const rangeStart = derived(timelineRange, $t => $t.range_start)
  const totalYears = derived(timelineRange, $t => $t.range_end - $t.range_start)

  function toPercent(year: number): number {
    return ((year - $rangeStart) / $totalYears) * 100
  }

  const ticks = derived(timelineRange, $t => {
    const start = Math.ceil($t.range_start / 10) * 10
    const end = Math.floor($t.range_end / 10) * 10
    const count = Math.floor((end - start) / 10) + 1
    return Array.from({ length: count }, (_, i) => start + i * 10)
  })

  const trackCount = derived(layers, $layers => ($layers.length > 0 ? TIMELINE_MAX_TRACKS : 0))

  const axisTop = derived(trackCount, $trackCount => 12 + Math.ceil($trackCount / 2) * TRACK_HEIGHT)

  const unsubscribeActiveLayers = activeLayers.subscribe($activeLayers => {
    console.log(
      '[timeline] active layers',
      $activeLayers.map(layer => ({
        label: layer.label,
        start_year: layer.start_year,
        end_year: layer.end_year,
        visual_start_year: layer.visual_start_year,
        visual_end_year: layer.visual_end_year,
        track: layer.track
      }))
    )
  })

  const unsubscribeActiveSublayers = activeSublayers.subscribe($activeSublayers => {
    console.log(
      '[timeline] active default sublayers',
      $activeSublayers.map(sublayer => ({
        id: sublayer.id,
        layer_label: sublayer.layer_label,
        label: sublayer.label,
        type: sublayer.type,
        sort_order: sublayer.sort_order
      }))
    )
  })

  onDestroy(() => {
    unsubscribeActiveLayers()
    unsubscribeActiveSublayers()
  })
</script>

<div class="timeline" style="height: {BASE_HEIGHT + $trackCount * TRACK_HEIGHT}px;">
  <Window padding={false} style="height: 100%; overflow: visible;">
    <div class="axis" style="--axis-top: {$axisTop}px;">
      {#each $ticks as tick}
        <div class="tick" style="left: {toPercent(tick)}%">
          <span class="tick-label">{tick}</span>
        </div>
      {/each}

        <div class="axis-line"></div>

      {#each $timelineLayers as layer}
        <TimelineLayer {layer} {toPercent} trackCount={$trackCount} />
      {/each}

      <Scrubber
        bind:value={$currentYear}
        min={$timelineRange.range_start}
        max={$timelineRange.range_end}
      />
    </div>
  </Window>
</div>

<style>
  .timeline {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    padding: 0 10px;
    font-family: var(--font-ui);
  }

  .axis {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .axis-line {
    position: absolute;
    top: var(--axis-top);
    left: 0;
    right: 0;
    height: 1.5px;
    background: rgba(0, 0, 0, 0.15);
  }

  .tick {
    position: absolute;
    top: var(--axis-top);
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .tick::before {
    content: '';
    width: 1px;
    height: 6px;
    background: rgba(0, 0, 0, 0.2);
  }

  .tick-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: rgba(0, 0, 0, 0.35);
    white-space: nowrap;
    margin-top: 3px;
  }
</style>
