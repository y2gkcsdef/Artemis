<script lang="ts">
  import Button from '$lib/components/base/Button.svelte'
  import Window from '$lib/components/base/Window.svelte'
  import {
    getSublayerVisibilityOverridesStore,
    isSublayerVisible,
    toggleSublayerVisibility,
    type Sublayer,
    type TimelineLayerState,
    type TimelineSide
  } from '$lib/stores/timeline'

  const { layer, colorMix, side, compareEnabled = false, onClose } = $props<{
    layer: TimelineLayerState
    colorMix: number
    side: TimelineSide
    compareEnabled?: boolean
    onClose: () => void
  }>()

  // svelte-ignore state_referenced_locally
  const leftVisibilityOverrides = getSublayerVisibilityOverridesStore('left')
  const rightVisibilityOverrides = getSublayerVisibilityOverridesStore('right')
  // svelte-ignore state_referenced_locally
  const sideVisibilityOverrides = getSublayerVisibilityOverridesStore(side)

  function stopMenuClick(event: MouseEvent) {
    event.stopPropagation()
  }

  function handleKeydown(event: KeyboardEvent) {
    event.stopPropagation()

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function handleSublayerToggle(event: MouseEvent, targetSide: TimelineSide, sublayer: Sublayer) {
    event.stopPropagation()
    toggleSublayerVisibility(targetSide, sublayer)
  }
</script>

<div
  class="layer-menu"
  role="dialog"
  tabindex="-1"
  aria-label="{layer.label} sublayers"
  onclick={stopMenuClick}
  onkeydown={handleKeydown}
>
  <Window padding={false}>
    <div class="menu-inner">
      <div class="menu-header">
        <span class="layer-dot" style="--layer-color-mix: {colorMix};"></span>
        <div class="layer-title">
          <span class="layer-label">{layer.label}</span>
          <span class="layer-years">{layer.start_year}-{layer.end_year}</span>
        </div>
        <Button
          aria-label="Close layer menu"
          size="icon"
          variant="quiet"
          style="--button-height: 28px; --button-min-width: 28px;"
          onclick={onClose}
        >
          x
        </Button>
      </div>

      {#if compareEnabled}
        <div class="compare-sublayer-list" aria-label="Sublayers">
          <span class="side-label">Left</span>
          <span class="side-label">Right</span>

          {#each layer.sublayers as sublayer}
            <Button
              class="sublayer-button {isSublayerVisible(sublayer, $leftVisibilityOverrides)
                ? 'is-enabled'
                : ''}"
              aria-pressed={isSublayerVisible(sublayer, $leftVisibilityOverrides)}
              variant={isSublayerVisible(sublayer, $leftVisibilityOverrides) ? 'default' : 'quiet'}
              style="
                --button-height: 34px;
                --button-min-width: 100%;
                --button-font-size: 14px;
              "
              onclick={event => handleSublayerToggle(event, 'left', sublayer)}
            >
              {sublayer.label}
            </Button>

            <Button
              class="sublayer-button {isSublayerVisible(sublayer, $rightVisibilityOverrides)
                ? 'is-enabled'
                : ''}"
              aria-pressed={isSublayerVisible(sublayer, $rightVisibilityOverrides)}
              variant={isSublayerVisible(sublayer, $rightVisibilityOverrides) ? 'default' : 'quiet'}
              style="
                --button-height: 34px;
                --button-min-width: 100%;
                --button-font-size: 14px;
              "
              onclick={event => handleSublayerToggle(event, 'right', sublayer)}
            >
              {sublayer.label}
            </Button>
          {/each}
        </div>
      {:else}
        <div class="sublayer-list" aria-label="Sublayers">
          {#each layer.sublayers as sublayer}
            <Button
              class="sublayer-button {isSublayerVisible(sublayer, $sideVisibilityOverrides)
                ? 'is-enabled'
                : ''}"
              aria-pressed={isSublayerVisible(sublayer, $sideVisibilityOverrides)}
              variant={isSublayerVisible(sublayer, $sideVisibilityOverrides) ? 'default' : 'quiet'}
              style="
                --button-height: 34px;
                --button-min-width: 100%;
                --button-font-size: 14px;
              "
              onclick={event => handleSublayerToggle(event, side, sublayer)}
            >
              {sublayer.label}
            </Button>
          {/each}
        </div>
      {/if}
    </div>
  </Window>
</div>

<style>
  .layer-menu {
    /* Base component */
    position: absolute;
    right: -12px;
    bottom: calc(100% + 8px);
    z-index: 20;
    width: min(260px, 72vw);

    /* Text */
    font-family: var(--font-ui);
  }

  .menu-inner {
    /* Base component */
    padding: 12px;
  }

  .menu-header {
    /* Base component */
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .layer-dot {
    /* Size */
    width: 14px;
    height: 14px;

    /* Shape */
    border-radius: var(--radius-pill);

    /* Color */
    background: color-mix(
      in srgb,
      var(--layer-color-min) calc((1 - var(--layer-color-mix)) * 100%),
      var(--layer-color-max) calc(var(--layer-color-mix) * 100%)
    );

    /* Shadow */
    box-shadow: inset 0 0 0 1.5px rgba(0, 0, 0, 0.08);
  }

  .layer-title {
    /* Base component */
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .layer-label {
    /* Text */
    color: rgb(52, 52, 52);
    font-size: 15px;
    font-weight: 700;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-years {
    /* Text */
    color: rgba(52, 52, 52, 0.7);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1;
  }

  .sublayer-list {
    /* Base component */
    display: grid;
    gap: 8px;
  }

  .compare-sublayer-list {
    /* Base component */
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
  }

  .side-label {
    /* Text */
    color: rgba(52, 52, 52, 0.72);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
  }

  :global(.sublayer-button.button) {
    /* Color */
    --button-bg: rgba(52, 52, 52, 0.08);
    --button-bg-hover: rgba(52, 52, 52, 0.12);
    --button-bg-active: rgba(52, 52, 52, 0.16);
    --button-border-color: rgba(52, 52, 52, 0.12);
    --button-color: rgb(52, 52, 52);
  }

  :global(.sublayer-button.button.is-enabled) {
    /* Color */
    --button-bg: color-mix(
      in srgb,
      var(--layer-color-min) calc((1 - var(--layer-color-mix)) * 100%),
      var(--layer-color-max) calc(var(--layer-color-mix) * 100%)
    );
    --button-bg-hover: color-mix(in srgb, var(--button-bg), black 8%);
    --button-bg-active: color-mix(in srgb, var(--button-bg), black 16%);
    --button-border-color: rgba(255, 255, 255, 0.4);
    --button-color: white;
  }
</style>
