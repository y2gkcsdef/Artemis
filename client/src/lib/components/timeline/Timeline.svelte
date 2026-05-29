<script lang="ts">
  import { onDestroy } from 'svelte'
  import { derived } from 'svelte/store'
  import {
    clearTimelineLayerFocus,
    getActiveLayersStore,
    getActiveSublayersStore,
    getCurrentYearStore,
    getDeactivatedLayerLabelsStore,
    layers,
    setTimelineYear,
    timelineLayers,
    timelineRange,
    TIMELINE_MAX_TRACKS,
    type TimelineSide
  } from '$lib/stores/timeline'
  import Window from '$lib/components/base/Window.svelte'
  import Scrubber from '$lib/components/timeline/Scrubber.svelte'
  import TimelineLayer from '$lib/components/timeline/TimelineLayer.svelte'

  const TRACK_HEIGHT = 26
  const BASE_HEIGHT = 24
  const { side = 'left', compareEnabled = false } = $props<{
    side?: TimelineSide
    compareEnabled?: boolean
  }>()

  // svelte-ignore state_referenced_locally
  const currentYear = getCurrentYearStore(side)
  const compareCurrentYear = getCurrentYearStore('right')
  // svelte-ignore state_referenced_locally
  const activeLayers = getActiveLayersStore(side)
  const compareActiveLayers = getActiveLayersStore('right')
  // svelte-ignore state_referenced_locally
  const activeSublayers = getActiveSublayersStore(side)
  // svelte-ignore state_referenced_locally
  const deactivatedLayerLabels = getDeactivatedLayerLabelsStore(side)
  const compareDeactivatedLayerLabels = getDeactivatedLayerLabelsStore('right')
  let axisElement: HTMLDivElement

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
  const activeLayerLabels = derived(activeLayers, $activeLayers =>
    new Set($activeLayers.map(layer => layer.label))
  )
  const compareActiveLayerLabels = derived(compareActiveLayers, $activeLayers =>
    new Set($activeLayers.map(layer => layer.label))
  )

  function handleTimelineClick(event: MouseEvent) {
    if (!axisElement) return

    const rect = axisElement.getBoundingClientRect()
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left))
    const percent = x / rect.width
    const nextYear = Math.round($timelineRange.range_start + percent * $totalYears)
    const targetSide =
      compareEnabled && Math.abs(nextYear - $compareCurrentYear) < Math.abs(nextYear - $currentYear)
        ? 'right'
        : side

    clearTimelineLayerFocus(targetSide)
    setTimelineYear(targetSide, nextYear)
  }

  function handleTimelineKeydown(event: KeyboardEvent) {
    if (event.key === 'Home') {
      event.preventDefault()
      clearTimelineLayerFocus(side)
      setTimelineYear(side, $timelineRange.range_start)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      clearTimelineLayerFocus(side)
      setTimelineYear(side, $timelineRange.range_end)
    }
  }

  const unsubscribeActiveLayers = activeLayers.subscribe($activeLayers => {
    console.log(
      `[timeline:${side}] active layers`,
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
      `[timeline:${side}] active default sublayers`,
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
    <div
      bind:this={axisElement}
      class="axis"
      role="slider"
      tabindex="0"
      aria-label="Timeline year"
      aria-valuemin={$timelineRange.range_start}
      aria-valuemax={$timelineRange.range_end}
      aria-valuenow={$currentYear}
      style="--axis-top: {$axisTop}px;"
      onclick={handleTimelineClick}
      onkeydown={handleTimelineKeydown}
    >
      {#each $ticks as tick}
        <div class="tick" style="left: {toPercent(tick)}%">
          <span class="tick-label">{tick}</span>
        </div>
      {/each}

        <div class="axis-line"></div>

      {#each $timelineLayers as layer}
        <TimelineLayer
          {layer}
          {toPercent}
          trackCount={$trackCount}
          active={$activeLayerLabels.has(layer.label) ||
            (compareEnabled && $compareActiveLayerLabels.has(layer.label))}
          deactivated={$deactivatedLayerLabels.has(layer.label) ||
            (compareEnabled && $compareDeactivatedLayerLabels.has(layer.label))}
          {side}
          {compareEnabled}
        />
      {/each}

      <Scrubber
        bind:value={$currentYear}
        min={$timelineRange.range_start}
        max={$timelineRange.range_end}
        {side}
      />

      {#if compareEnabled}
        <Scrubber
          bind:value={$compareCurrentYear}
          min={$timelineRange.range_start}
          max={$timelineRange.range_end}
          side="right"
          class="compare-scrubber"
        />
      {/if}
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
