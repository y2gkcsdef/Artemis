<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Button from '$lib/components/base/Button.svelte'
  import Window from '$lib/components/base/Window.svelte'
  import {
    closeIiifMaskWindow,
    viewIiifMask,
    type IiifMaskWindow
  } from '$lib/stores/workspace'

  const SHEETS = {
    gereduceerd: {
      url: '/gereduceerd_sprites.jpg',
      width: 1024,
      height: 1197
    },
    primitief: {
      url: '/primitief_sprites.jpg',
      width: 1999,
      height: 2178
    }
  } as const

  let { mask }: {
    mask: IiifMaskWindow
  } = $props()
  let maskWindowElement: HTMLDivElement

  const sheet = $derived(SHEETS[mask.spriteSheet])
  const previewScale = $derived(Math.min(2, 220 / mask.spriteWidth, 150 / mask.spriteHeight))
  const previewStyle = $derived(
    [
      `width: ${Math.round(mask.spriteWidth * previewScale)}px`,
      `height: ${Math.round(mask.spriteHeight * previewScale)}px`,
      `background-image: url("${sheet.url}")`,
      `background-size: ${Math.round(sheet.width * previewScale)}px ${Math.round(sheet.height * previewScale)}px`,
      `background-position: -${Math.round(mask.spriteX * previewScale)}px -${Math.round(mask.spriteY * previewScale)}px`
    ].join('; ')
  )
  const windowStyle = $derived(
    `left: min(${mask.x + 14}px, calc(100vw - 260px)); top: min(${mask.y + 14}px, calc(100vh - 230px));`
  )

  function handleDocumentPointerdown(event: PointerEvent) {
    if (!maskWindowElement || maskWindowElement.contains(event.target as Node)) return

    closeIiifMaskWindow(mask.id)
  }

  onMount(() => {
    document.addEventListener('pointerdown', handleDocumentPointerdown)
  })

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerdown)
  })
</script>

<div class="mask-window-position" style={windowStyle} bind:this={maskWindowElement}>
  <Window padding={false} class="mask-window">
    <div class="mask-window-header">
      <h2>{mask.label}</h2>
      <Button
        size="icon"
        variant="quiet"
        aria-label="Close mask preview"
        onclick={() => closeIiifMaskWindow(mask.id)}
      >
        x
      </Button>
    </div>

    <div class="mask-preview" style={previewStyle} aria-label={`Preview of ${mask.label}`}></div>

    <div class="mask-window-footer">
      <Button onclick={() => viewIiifMask(mask)}>View</Button>
    </div>
  </Window>
</div>

<style>
  .mask-window-position {
    position: absolute;
    z-index: 4;
    pointer-events: auto;
  }

  :global(.mask-window) {
    width: 240px;
    overflow: hidden;
  }

  .mask-window-header {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
    padding: 8px 8px 6px 10px;
    border-bottom: 1px solid rgba(0, 26, 104, 0.12);
  }

  .mask-window-header h2 {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    color: rgb(36, 42, 36);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mask-preview {
    margin: 10px auto;
    border: 1px solid rgba(0, 26, 104, 0.16);
    background-repeat: no-repeat;
    background-color: rgb(237, 239, 220);
  }

  .mask-window-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0 10px 10px;
  }
</style>
