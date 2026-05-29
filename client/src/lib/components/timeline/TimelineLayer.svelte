<script lang="ts">
  import { onDestroy } from 'svelte'
  import {
    focusTimelineLayer,
    focusTimelineLayerNearScrubber,
    type TimelineLayerState,
    type TimelineSide
  } from '$lib/stores/timeline'
  import Button from '$lib/components/base/Button.svelte'
  import LayerMenu from '$lib/components/timeline/LayerMenu.svelte'

  const TRACK_HEIGHT = 26
  const AXIS_OFFSET = 12
  const BELOW_AXIS_GAP = 7

  const {
    layer,
    toPercent,
    trackCount,
    active,
    deactivated,
    side,
    compareEnabled = false,
    menuOpen = false,
    onMenuToggle,
    onMenuClose
  } = $props<{
    layer: TimelineLayerState
    toPercent: (year: number) => number
    trackCount: number
    active: boolean
    deactivated: boolean
    side: TimelineSide
    compareEnabled?: boolean
    menuOpen?: boolean
    onMenuToggle: (layer: TimelineLayerState) => void
    onMenuClose: () => void
  }>()

  const axisTop = $derived(AXIS_OFFSET + Math.ceil(trackCount / 2) * TRACK_HEIGHT)
  const layerTop = $derived(getTop(layer.track))
  const visualWidth = $derived(
    toPercent(layer.visual_end_year) - toPercent(layer.visual_start_year)
  )
  const colorMix = $derived(getColorMix(layer.label))
  const popDirection = $derived(layerTop < axisTop ? -1 : 1)
  const shadowDirection = $derived(layerTop < axisTop ? 1 : -1)
  let closeMenuTimeout: ReturnType<typeof setTimeout> | null = null

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
    if (compareEnabled) {
      focusTimelineLayerNearScrubber(layer)
      return
    }

    focusTimelineLayer(side, layer)
  }

  function handleLayerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    event.stopPropagation()
    if (compareEnabled) {
      focusTimelineLayerNearScrubber(layer)
      return
    }

    focusTimelineLayer(side, layer)
  }

  function handleMenuToggle(event: MouseEvent) {
    event.stopPropagation()
    onMenuToggle(layer)
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    event.stopPropagation()
  }

  function clearCloseMenuTimeout() {
    if (!closeMenuTimeout) return

    clearTimeout(closeMenuTimeout)
    closeMenuTimeout = null
  }

  function scheduleMenuClose() {
    if (!menuOpen) return

    clearCloseMenuTimeout()
    closeMenuTimeout = setTimeout(() => {
      onMenuClose()
      closeMenuTimeout = null
    }, 180)
  }

  onDestroy(clearCloseMenuTimeout)
</script>

<div
  class="layer-anchor"
  role="group"
  aria-label="{layer.label} timeline layer controls"
  class:is-active={active}
  class:is-deactivated={deactivated}
  class:has-menu-open={menuOpen}
  onpointerenter={clearCloseMenuTimeout}
  onpointerleave={scheduleMenuClose}
  style="
    left: {toPercent(layer.visual_start_year)}%;
    width: {visualWidth}%;
    top: {layerTop}px;
    --layer-color-mix: {colorMix};
    --pop-direction: {popDirection};
    --shadow-direction: {shadowDirection};
  "
>
  <div
    class="layer-block"
    role="button"
    tabindex="0"
    onclick={handleLayerClick}
    onkeydown={handleLayerKeydown}
  >
    {layer.label}
  </div>

  <Button
    class="layer-menu-button"
    aria-label={menuOpen
      ? `Close ${layer.label} sublayer menu`
      : `Open ${layer.label} sublayer menu`}
    aria-expanded={menuOpen}
    size="icon"
    style="
      --button-height: 24px;
      --button-min-width: 24px;
      --button-color: white;
      --button-border-color: rgba(255, 255, 255, 0.46);
    "
    onclick={handleMenuToggle}
    onkeydown={handleMenuKeydown}
  >
    ^
  </Button>

  {#if menuOpen}
    <LayerMenu {layer} {colorMix} {side} {compareEnabled} onClose={onMenuClose} />
  {/if}
</div>

<style>
  .layer-anchor {
    /* Color */
    --layer-color-min: rgb(223, 188, 75);
    --layer-color-max: rgb(59, 181, 32);

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
  }

  .layer-anchor.is-active {
    z-index: 2;
    transform: translateY(calc(var(--pop-direction) * var(--layer-pop-distance)))
      scale(var(--layer-pop-scale));
    box-shadow: 0 calc(var(--shadow-direction) * var(--layer-active-shadow-y))
      var(--layer-active-shadow-blur) var(--layer-active-shadow-color);
  }

  .layer-anchor.has-menu-open {
    z-index: 30;
  }

  .layer-anchor.is-deactivated {
    opacity: var(--layer-deactivated-opacity);
    filter: saturate(var(--layer-deactivated-saturation));
  }

  .layer-block {
    /* Base component */
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 18px 0 6px;
    overflow: hidden;

    /* Shape */
    border-radius: calc(20px / var(--control-corner-ratio));

    /* Color */
    background: color-mix(
      in srgb,
      var(--layer-color-min) calc((1 - var(--layer-color-mix)) * 100%),
      var(--layer-color-max) calc(var(--layer-color-mix) * 100%)
    );

    /* Text */
    color: white;
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :global(.layer-menu-button.button) {
    /* Color */
    --button-bg: color-mix(
      in srgb,
      var(--layer-color-min) calc((1 - var(--layer-color-mix)) * 100%),
      var(--layer-color-max) calc(var(--layer-color-mix) * 100%)
    );
    --button-bg-hover: color-mix(in srgb, var(--button-bg), black 8%);
    --button-bg-active: color-mix(in srgb, var(--button-bg), black 16%);

    /* Base component */
    position: absolute;
    right: -12px;
    top: 50%;
    z-index: 3;
    transform: translateY(-50%);

    /* Shadow */
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16);
  }
</style>
