<script lang="ts">
  import { derived } from 'svelte/store'
  import { currentYear, layers, timelineRange, type Layer } from '$lib/stores/timeline'
  import Window from '$lib/components/base/Window.svelte'
  import Scrubber from '$lib/components/timeline/Scrubber.svelte'
  import TimelineLayer from '$lib/components/timeline/TimelineLayer.svelte'

  type LayerWithTrack = Layer & {
    track: number
  }

  const MAX_TRACKS = 4
  const TRACK_HEIGHT = 26
  const BASE_HEIGHT = 24
  const LABEL_PADDING_YEARS = 3
  const MIN_VISUAL_YEARS = 15

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

  const layersWithTracks = derived(layers, $layers => {
    const trackEnds = Array.from({ length: MAX_TRACKS }, () => Number.NEGATIVE_INFINITY)

    return $layers.map(layer => {
      const labelYears = Math.ceil(layer.label.length * 1.4) + LABEL_PADDING_YEARS
      const visualEndYear =
        layer.start_year + Math.max(layer.end_year - layer.start_year, MIN_VISUAL_YEARS, labelYears)

      let assigned = -1

      for (let i = 0; i < trackEnds.length; i++) {
        if (layer.start_year > trackEnds[i]) {
          assigned = i
          break
        }
      }

      if (assigned === -1) {
        assigned = trackEnds.indexOf(Math.min(...trackEnds))
      }

      trackEnds[assigned] = visualEndYear

      return { ...layer, track: assigned }
    })
  })

  const trackCount = derived(layers, $layers => ($layers.length > 0 ? MAX_TRACKS : 0))

  const axisTop = derived(trackCount, $trackCount => 12 + Math.ceil($trackCount / 2) * TRACK_HEIGHT)
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

      {#each $layersWithTracks as layer}
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
