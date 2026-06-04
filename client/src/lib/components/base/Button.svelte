<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type ButtonVariant = 'default' | 'quiet' | 'danger'
  type ButtonSize = 'sm' | 'md' | 'icon'

  let {
    children,
    class: className = '',
    style = '',
    type = 'button',
    variant = 'default',
    size = 'md',
    disabled = false,
    ...restProps
  } = $props<
    HTMLButtonAttributes & {
      children?: Snippet
      variant?: ButtonVariant
      size?: ButtonSize
    }
  >()
</script>

<button
  {...restProps}
  {type}
  {disabled}
  class="button {className}"
  data-variant={variant}
  data-size={size}
  {style}
>
  {@render children?.()}
</button>

<style>
  .button {
    /* Color */
    --button-bg: rgba(255, 253, 248, 0.96);
    --button-bg-hover: #f7f2e7;
    --button-bg-active: #ece4d5;
    --button-color: #4a4438;
    --button-border-color: rgba(80, 72, 58, 0.12);
    --button-focus-color: rgba(151, 137, 87, 0.42);

    /* Size */
    --button-height: 30px;
    --button-min-width: 30px;
    --button-padding-x: 10px;
    --button-gap: 6px;

    /* Shape */
    --button-radius: calc(var(--button-height) / var(--control-corner-ratio));

    /* Text */
    --button-font-size: 12px;
    --button-font-weight: 600;

    appearance: none;
    min-width: var(--button-min-width);
    height: var(--button-height);
    border: 1.5px solid var(--button-border-color);
    border-radius: var(--button-radius);
    background: var(--button-bg);
    color: var(--button-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--button-gap);
    padding: 0 var(--button-padding-x);
    font-family: var(--font-ui);
    font-size: var(--button-font-size);
    font-weight: var(--button-font-weight);
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      color 120ms ease,
      opacity 120ms ease;
  }

  .button:hover:not(:disabled) {
    background: var(--button-bg-hover);
  }

  .button:active:not(:disabled) {
    background: var(--button-bg-active);
  }

  .button:focus-visible {
    outline: 2px solid var(--button-focus-color);
    outline-offset: 2px;
  }

  .button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  .button[data-variant='quiet'] {
    --button-bg: transparent;
    --button-bg-hover: rgba(80, 72, 58, 0.07);
    --button-bg-active: rgba(80, 72, 58, 0.11);
    --button-border-color: transparent;
  }

  .button[data-variant='danger'] {
    --button-bg: #fff0ea;
    --button-bg-hover: #ffe2d7;
    --button-bg-active: #f8cdbd;
    --button-color: #87321f;
    --button-border-color: rgba(135, 50, 31, 0.24);
  }

  .button[data-size='sm'] {
    --button-height: 24px;
    --button-min-width: 24px;
    --button-padding-x: 8px;
    --button-font-size: 11px;
  }

  .button[data-size='icon'] {
    --button-height: 30px;
    --button-min-width: 30px;
    --button-padding-x: 0;
  }
</style>
