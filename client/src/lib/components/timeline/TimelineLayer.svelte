<script lang="ts">
  import { focusTimelineLayer, type TimelineLayerState } from '$lib/stores/timeline'

  const TRACK_HEIGHT = 26
  const AXIS_OFFSET = 12
  const BELOW_AXIS_GAP = 7

  const { layer, toPercent, trackCount, active, deactivated } = $props<{
    layer: TimelineLayerState
    toPercent: (year: number) => number
    trackCount: number
    active: boolean
    deactivated: boolean
  }>()

  const axisTop = $derived(AXIS_OFFSET + Math.ceil(trackCount / 2) * TRACK_HEIGHT)
  const layerTop = $derived(getTop(layer.track))
  const visualWidth = $derived(
    toPercent(layer.visual_end_year) - toPercent(layer.visual_start_year)
  )
  const colorMix = $derived(getColorMix(layer.label))
  const popDirection = $derived(layerTop < axisTop ? -1 : 1)
  const shadowDirection = $derived(layerTop < axisTop ? 1 : -1)

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

  function handleLayerClick(event: MouseEvent) {
    event.stopPropagation()
    focusTimelineLayer(layer)
  }

  function handleLayerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    event.stopPropagation()
    focusTimelineLayer(layer)
  }
</script>

<div
  class="layer-block"
  class:is-active={active}
  class:is-deactivated={deactivated}
  role="button"
  tabindex="0"
  onclick={handleLayerClick}
  onkeydown={handleLayerKeydown}
  style="
    left: {toPercent(layer.visual_start_year)}%;
    width: {visualWidth}%;
    top: {layerTop}px;
    --layer-color-mix: {colorMix};
    --pop-direction: {popDirection};
    --shadow-direction: {shadowDirection};
  "
>
  {layer.label}
</div>

<style>
  .layer-block {
    /* Color */
    --layer-color-min: rgb(80, 58, 167);
    --layer-color-max: rgb(32, 181, 92);

    /* Animation */
    --layer-pop-distance: 10px;
    --layer-pop-scale: 1.04;
    --layer-pop-duration: 160ms;
    --layer-pop-easing: cubic-bezier(0.2, 0.8, 0.2, 1);

    /* Active state */
    --layer-active-shadow-y: 7px;
    --layer-active-shadow-blur: 2px;
    --layer-active-shadow-color: rgba(0, 0, 0, 0.22);

    /* Deactivated state */
    --layer-deactivated-saturation: 0.18;
    --layer-deactivated-opacity: 0.72;

    /* Base component */
    position: absolute;
    height: 20px;
    z-index: 1;
    transform: translateY(0) scale(1);
    opacity: 1;
    filter: saturate(1);
    transition:
      transform var(--layer-pop-duration) var(--layer-pop-easing),
      box-shadow var(--layer-pop-duration) var(--layer-pop-easing),
      filter var(--layer-pop-duration) var(--layer-pop-easing),
      opacity var(--layer-pop-duration) var(--layer-pop-easing);
    will-change: transform, filter;
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

  .layer-block.is-active {
    z-index: 2;
    transform: translateY(calc(var(--pop-direction) * var(--layer-pop-distance)))
      scale(var(--layer-pop-scale));
    box-shadow: 0 calc(var(--shadow-direction) * var(--layer-active-shadow-y))
      var(--layer-active-shadow-blur) var(--layer-active-shadow-color);
  }

  .layer-block.is-deactivated {
    opacity: var(--layer-deactivated-opacity);
    filter: saturate(var(--layer-deactivated-saturation));
  }
</style>
