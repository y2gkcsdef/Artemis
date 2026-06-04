<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    class: className = '',
    padding = true,
    style = ''
  } = $props<{
    children: Snippet
    class?: string
    padding?: boolean
    style?: string
  }>()
</script>

<section class="window {className}" class:no-padding={!padding} {style}>
  {@render children()}
</section>

<style>
  .window {
    --window-bg: rgba(255, 253, 248, 0.94);
    --window-border: 1px solid rgba(80, 72, 58, 0.1);
    --window-corner-size: 42px;
    --window-radius: calc(var(--window-corner-size) / var(--control-corner-ratio));
    --window-shadow: 0 6px 22px rgba(63, 57, 45, 0.12);

    background: var(--window-bg);
    border: var(--window-border);
    border-radius: var(--window-radius);
    box-shadow: var(--window-shadow);
    padding: 8px 10px;
  }

  .window.no-padding {
    padding: 0;
  }
</style>
