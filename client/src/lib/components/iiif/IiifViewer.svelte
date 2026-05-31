<script lang="ts">
  import { onMount } from 'svelte'
  import Button from '$lib/components/base/Button.svelte'
  import Window from '$lib/components/base/Window.svelte'
  import type { TimelineSide } from '$lib/stores/timeline'
  import { closeIiifViewer } from '$lib/stores/workspace'
  import { fetchIiifManifestResource, type IiifManifestResource } from './iiifManifest'

  const { side, manifest, label } = $props<{
    side: TimelineSide
    manifest: string
    label: string
  }>()

  let manifestResource = $state<IiifManifestResource | null>(null)
  let loading = $state(true)
  let error = $state<string | null>(null)
  let metadataOpen = $state(false)
  let copyState = $state<'idle' | 'copied' | 'failed'>('idle')
  let scale = $state(1)
  let offsetX = $state(0)
  let offsetY = $state(0)
  let dragging = $state(false)
  let lastPointerX = 0
  let lastPointerY = 0

  const imageStyle = $derived(
    `transform: translate(${offsetX}px, ${offsetY}px) scale(${scale});`
  )

  onMount(() => {
    let cancelled = false

    async function loadManifest() {
      loading = true
      error = null
      metadataOpen = false
      scale = 1
      offsetX = 0
      offsetY = 0

      try {
        const resource = await fetchIiifManifestResource(manifest)

        if (cancelled) return

        manifestResource = resource
      } catch (err) {
        if (cancelled) return

        error = err instanceof Error ? err.message : 'Failed to load IIIF manifest'
      } finally {
        if (!cancelled) {
          loading = false
        }
      }
    }

    loadManifest()

    return () => {
      cancelled = true
    }
  })

  function handleWheel(event: WheelEvent) {
    event.preventDefault()

    const delta = event.deltaY > 0 ? -0.12 : 0.12
    scale = Math.min(6, Math.max(0.25, Number((scale + delta).toFixed(2))))
  }

  function handlePointerDown(event: PointerEvent) {
    dragging = true
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return

    offsetX += event.clientX - lastPointerX
    offsetY += event.clientY - lastPointerY
    lastPointerX = event.clientX
    lastPointerY = event.clientY
  }

  function handlePointerUp(event: PointerEvent) {
    dragging = false
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  }

  async function copyManifestUrl() {
    try {
      await navigator.clipboard.writeText(manifest)
      copyState = 'copied'
    } catch {
      copyState = 'failed'
    }
  }
</script>

<section class="iiif-viewer" data-side={side} aria-label={`IIIF viewer for ${label}`}>
  <header class="viewer-toolbar">
    <div class="viewer-actions">
      <h2>{label}</h2>
      <Button class="metadata-button" onclick={() => (metadataOpen = !metadataOpen)}>
        {metadataOpen ? 'Hide metadata' : 'Metadata'}
      </Button>
      <Button
        size="icon"
        variant="quiet"
        aria-label="Close IIIF viewer"
        onclick={() => closeIiifViewer(side)}
      >
        x
      </Button>
    </div>
  </header>

  <div
    class="viewer-stage"
    class:is-dragging={dragging}
    role="img"
    aria-label={`Pan and zoom view of ${label}`}
    onwheel={handleWheel}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
  >
    {#if loading}
      <p>Loading manifest</p>
    {:else if error}
      <p>{error}</p>
    {:else if manifestResource}
      <img
        src={manifestResource.imageUrl}
        alt={label}
        style={imageStyle}
        draggable="false"
      />
    {/if}
  </div>

  {#if metadataOpen && manifestResource}
    <div class="metadata-window">
      <Window padding={false}>
        <div class="metadata-content">
          <div class="metadata-section">
            <span class="eyebrow">Manifest</span>
            <h3>{label}</h3>
          </div>

          <Button class="copy-button" onclick={copyManifestUrl}>
            {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy manifest URL'}
          </Button>

          <dl>
            <div>
              <dt>Manifest type</dt>
              <dd>{manifestResource.manifestType}</dd>
            </div>
            <div>
              <dt>Canvas count</dt>
              <dd>{manifestResource.canvasCount}</dd>
            </div>
            {#if manifestResource.canvasLabel}
              <div>
                <dt>Canvas</dt>
                <dd>{manifestResource.canvasLabel}</dd>
              </div>
            {/if}
            {#if manifestResource.width && manifestResource.height}
              <div>
                <dt>Dimensions</dt>
                <dd>{manifestResource.width} x {manifestResource.height}px</dd>
              </div>
            {/if}
            <div>
              <dt>Manifest URL</dt>
              <dd class="manifest-url">{manifest}</dd>
            </div>
            {#each manifestResource.metadata as item}
              <div>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            {/each}
          </dl>
        </div>
      </Window>
    </div>
  {/if}
</section>

<style>
  .iiif-viewer {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    background: rgb(250, 251, 245);
    color: rgb(35, 35, 35);
    display: grid;
    grid-template-rows: auto 1fr;
    font-family: var(--font-ui);
    overflow: hidden;
  }

  .viewer-toolbar {
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(0, 26, 104, 0.1);
    background: rgba(250, 251, 245, 0.96);
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
    z-index: 2;
  }

  .viewer-actions {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  .iiif-viewer[data-side='left'] .viewer-toolbar {
    justify-content: flex-start;
  }

  .iiif-viewer[data-side='left'] .viewer-actions {
    flex-direction: row-reverse;
  }

  .viewer-actions h2 {
    margin: 0;
    max-width: 22vw;
    overflow: hidden;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.metadata-button) {
    --button-bg: rgb(176, 151, 74);
    --button-bg-hover: rgb(162, 138, 66);
    --button-bg-active: rgb(145, 122, 56);
    --button-color: white;
    --button-border-color: rgba(130, 106, 45, 0.24);
  }

  .viewer-stage {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: grid;
    place-items: center;
    touch-action: none;
    cursor: grab;
  }

  .viewer-stage.is-dragging {
    cursor: grabbing;
  }

  .viewer-stage p {
    max-width: min(560px, 100%);
    margin: 0;
    overflow-wrap: anywhere;
    color: rgba(52, 52, 52, 0.68);
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
  }

  .viewer-stage img {
    max-width: min(82%, 880px);
    max-height: 76%;
    height: auto;
    transform-origin: center;
    user-select: none;
    will-change: transform;
  }

  .metadata-window {
    position: absolute;
    top: 66px;
    right: 14px;
    z-index: 3;
    width: min(340px, calc(100% - 28px));
  }

  .iiif-viewer[data-side='left'] .metadata-window {
    right: auto;
    left: 14px;
  }

  .metadata-content {
    padding: 14px;
  }

  .metadata-section {
    margin-bottom: 12px;
  }

  .eyebrow,
  dt {
    display: block;
    color: rgba(35, 35, 35, 0.48);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h3 {
    margin: 4px 0 0;
    font-size: 18px;
    line-height: 1.2;
  }

  :global(.copy-button) {
    width: 100%;
    justify-content: flex-start;
    margin-bottom: 16px;
    --button-height: 38px;
    --button-bg: rgb(185, 164, 98);
    --button-bg-hover: rgb(172, 151, 88);
    --button-bg-active: rgb(155, 134, 74);
    --button-color: rgb(35, 35, 35);
  }

  dl {
    display: grid;
    gap: 14px;
    margin: 0;
  }

  dd {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.35;
  }

  .manifest-url {
    font-family: var(--font-mono);
    font-size: 11px;
  }
</style>
