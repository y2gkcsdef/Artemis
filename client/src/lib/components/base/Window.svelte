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
    --window-bg: rgb(245, 247, 226);
    --window-border: 2px solid rgba(0, 26, 104, 0.1);
    --window-corner-size: 42px;
    --window-radius: calc(var(--window-corner-size) / var(--control-corner-ratio));
    --window-shadow: 0px 0px 20px rgba(0, 0, 0, .1);

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
