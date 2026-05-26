<script lang="ts">
  let {
    value = $bindable(1800),
    min,
    max,
    class: className = ''
  } = $props<{
    value?: number
    min: number
    max: number
    class?: string
  }>()

  let scrubberElement: HTMLDivElement
  let dragging = $state(false)

  const span = $derived(Math.max(1, max - min))
  const percent = $derived(((value - min) / span) * 100)
  const clampedPercent = $derived(Math.min(100, Math.max(0, percent)))

  function updateValue(event: PointerEvent) {
    const timeline = scrubberElement.parentElement

    if (!timeline) return

    const rect = timeline.getBoundingClientRect()
    const x = Math.min(rect.width, Math.max(0, event.clientX - rect.left))
    const nextPercent = x / rect.width

    value = Math.round(min + nextPercent * span)
  }

  function handlePointerDown(event: PointerEvent) {
    dragging = true
    const handle = event.currentTarget as HTMLButtonElement

    handle.setPointerCapture(event.pointerId)
    updateValue(event)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return

    updateValue(event)
  }

  function handlePointerUp(event: PointerEvent) {
    dragging = false
    const handle = event.currentTarget as HTMLButtonElement

    handle.releasePointerCapture(event.pointerId)
  }
</script>

<div
  bind:this={scrubberElement}
  class="scrubber {className}"
  class:is-dragging={dragging}
  style="
    --scrubber-left: {clampedPercent}%;
  "
>
  <button
    class="scrubber-handle"
    type="button"
    aria-label="Selected year {value}"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    <span class="scrubber-chevron" aria-hidden="true">‹</span>
    <span class="scrubber-year">{value}</span>
    <span class="scrubber-chevron" aria-hidden="true">›</span>
  </button>

  <div class="scrubber-line" aria-hidden="true"></div>
</div>

<style>
  .scrubber {
    --scrubber-color: #4e4e4e;
    --scrubber-bg: #fbfff1;
    --scrubber-line-width: 4px;
    --scrubber-line-radius: 999px;
    --scrubber-handle-width: 92px;
    --scrubber-handle-height: 34px;
    --scrubber-float-gap: -20px;

    position: absolute;
    top: 0;
    bottom: 0;
    left: var(--scrubber-left);
    z-index: 10;
    width: 0;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .scrubber-handle {
    position: absolute;
    top: calc(-1 * (var(--scrubber-handle-height) + var(--scrubber-float-gap)));
    left: 50%;
    width: var(--scrubber-handle-width);
    height: var(--scrubber-handle-height);
    transform: translateX(-50%);
    border: 3px solid var(--scrubber-color);
    border-radius: calc(var(--scrubber-handle-height) / var(--control-corner-ratio));
    background: var(--scrubber-bg);
    color: var(--scrubber-color);
    display: grid;
    grid-template-columns: 16px 1fr 16px;
    align-items: center;
    justify-items: center;
    gap: 2px;
    font-family: var(--font-ui);
    font-size: 16px;
    line-height: 1;
    cursor: grab;
    pointer-events: auto;
    user-select: none;
    touch-action: none;
  }

  .scrubber.is-dragging .scrubber-handle {
    cursor: grabbing;
  }

  .scrubber-year {
    min-width: 4ch;
    text-align: center;
    font-weight: 600;
  }

  .scrubber-chevron {
    font-size: 28px;
    line-height: 0.75;
  }

  .scrubber-line {
    position: absolute;
    top: calc(-1 * var(--scrubber-float-gap));
    bottom: 18px;
    left: 50%;
    width: var(--scrubber-line-width);
    min-height: 36px;
    transform: translateX(-50%);
    border-radius: var(--scrubber-line-radius);
    background: var(--scrubber-color);
  }
</style>
