<script lang="ts">
  const MIN_VISUAL_YEARS = 15
  const TRACK_HEIGHT = 26
  const AXIS_OFFSET = 12
  const BELOW_AXIS_GAP = 7

  const { layer, toPercent, trackCount } = $props<{
    layer: { label: string; start_year: number; end_year: number; track: number }
    toPercent: (year: number) => number
    trackCount: number
  }>()

  const axisTop = $derived(AXIS_OFFSET + Math.ceil(trackCount / 2) * TRACK_HEIGHT)
  const visualWidth = $derived(
    toPercent(Math.max(layer.end_year, layer.start_year + MIN_VISUAL_YEARS)) -
      toPercent(layer.start_year)
  )
  const colorMix = $derived(getColorMix(layer.label))

  function getColorMix(seed: string): number {
    let hash = 0

    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }

    return (hash % 101) / 100
  }

  function getTop(track: number): number {
    if (track % 2 === 0) {
      return axisTop - (Math.floor(track / 2) + 1) * TRACK_HEIGHT
    }

    return axisTop + BELOW_AXIS_GAP + Math.floor(track / 2) * TRACK_HEIGHT
  }
</script>

<div
  class="layer-block"
  style="
    left: {toPercent(layer.start_year)}%;
    width: max(4px, {visualWidth}%);
    top: {getTop(layer.track)}px;
    --layer-color-mix: {colorMix};
  "
>
  {layer.label}
</div>

<style>
  .layer-block {
    --layer-color-min: rgb(80, 58, 167);
    --layer-color-max: rgb(32, 181, 92);

    /* Base component */
    position: absolute;
    height: 20px;
    background: color-mix(
      in srgb,
      var(--layer-color-min) calc((1 - var(--layer-color-mix)) * 100%),
      var(--layer-color-max) calc(var(--layer-color-mix) * 100%)
    );
    border-radius: calc(20px / var(--control-corner-ratio));
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    min-width: max-content;

    /* Text */
    color: white;
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
