<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Button from '$lib/components/base/Button.svelte'
  import Window from '$lib/components/base/Window.svelte'
  import { focusTimelineLayerByLabel, leftActiveLayers } from '$lib/stores/timeline'
  import { focusMapLocation } from '$lib/stores/workspace'
  import { searchAtlas, type SearchResult } from './searchApi'

  let query = $state('')
  let expanded = $state(false)
  let activeMapOnly = $state(false)
  let includeManifest = $state(true)
  let includeToponym = $state(true)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let results = $state<SearchResult[]>([])
  let searchMenuElement: HTMLDivElement
  let searchVersion = 0
  const activeLayerLabels = $derived(new Set($leftActiveLayers.map(layer => layer.label)))
  const filteredResults = $derived(
    results.filter(result => {
      if (result.type === 'iiif_manifest' && !includeManifest) return false
      if (result.type === 'toponym' && !includeToponym) return false
      if (activeMapOnly && !activeLayerLabels.has(result.layer_label)) return false

      return true
    })
  )

  $effect(() => {
    const trimmedQuery = query.trim()
    const currentVersion = ++searchVersion

    error = null

    if (trimmedQuery.length < 2) {
      loading = false
      results = []
      return
    }

    loading = true
    expanded = true

    const timeout = window.setTimeout(async () => {
      try {
        const nextResults = await searchAtlas(trimmedQuery)

        if (currentVersion === searchVersion) {
          results = nextResults
        }
      } catch (err) {
        if (currentVersion === searchVersion) {
          error = err instanceof Error ? err.message : 'Search failed'
          results = []
        }
      } finally {
        if (currentVersion === searchVersion) {
          loading = false
        }
      }
    }, 180)

    return () => window.clearTimeout(timeout)
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    expanded = true
  }

  function clearSearch() {
    query = ''
    expanded = false
    results = []
    error = null
  }

  function getResultTypeLabel(type: SearchResult['type']) {
    return type === 'iiif_manifest' ? 'Manifest' : 'Toponym'
  }

  function handleDocumentPointerdown(event: PointerEvent) {
    if (!searchMenuElement || searchMenuElement.contains(event.target as Node)) return

    expanded = false
  }

  function handleResultClick(result: SearchResult) {
    focusTimelineLayerByLabel('left', result.layer_label)

    if (result.lon !== null && result.lat !== null) {
      focusMapLocation({
        side: 'left',
        lon: result.lon,
        lat: result.lat,
        zoom: result.type === 'iiif_manifest' ? 13 : 14
      })
    }

    expanded = false
  }

  onMount(() => {
    document.addEventListener('pointerdown', handleDocumentPointerdown)
  })

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerdown)
  })
</script>

<div class="search-menu" bind:this={searchMenuElement}>
  <Window padding={false}>
    <form class="search-form" role="search" onsubmit={handleSubmit}>
      <input
        bind:value={query}
        aria-label="Search manifests and toponyms"
        placeholder="Search"
        autocomplete="off"
        onfocus={() => (expanded = true)}
      />

      {#if query}
        <Button size="icon" variant="quiet" aria-label="Clear search" onclick={clearSearch}>
          x
        </Button>
      {/if}
    </form>

    {#if expanded}
      <fieldset class="search-filters" aria-label="Search filters">
        <label>
          <input type="checkbox" bind:checked={activeMapOnly} />
          <span>Active map</span>
        </label>
        <label>
          <input type="checkbox" bind:checked={includeManifest} />
          <span>Manifest</span>
        </label>
        <label>
          <input type="checkbox" bind:checked={includeToponym} />
          <span>Toponym</span>
        </label>
      </fieldset>
    {/if}

    {#if expanded && query.trim().length >= 2}
      <div class="search-results" aria-label="Search results">
        {#if loading}
          <div class="search-status">Searching</div>
        {:else if error}
          <div class="search-status">{error}</div>
        {:else if filteredResults.length === 0}
          <div class="search-status">No results</div>
        {:else}
          {#each filteredResults as result}
            <button class="search-result" type="button" onclick={() => handleResultClick(result)}>
              <span class="result-label">{result.label}</span>
              <span class="result-source">{result.layer_label}</span>
              <span class="result-tags">
                <span>{getResultTypeLabel(result.type)}</span>
                <span>{result.sublayer_label}</span>
              </span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </Window>
</div>

<style>
  .search-menu {
    width: min(440px, calc(100vw - 32px));
    font-family: var(--font-ui);
  }

  .search-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    min-height: 38px;
    padding: 4px 6px 4px 12px;
  }

  .search-form input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: rgb(52, 52, 52);
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
  }

  .search-form input::placeholder {
    color: rgba(52, 52, 52, 0.48);
  }

  .search-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    border: 0;
    border-top: 1px solid rgba(0, 26, 104, 0.08);
    padding: 8px;
  }

  .search-filters label {
    min-width: 0;
    border: 1px solid rgba(0, 26, 104, 0.08);
    border-radius: calc(22px / var(--control-corner-ratio));
    background: rgba(52, 52, 52, 0.05);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 7px;
    color: rgba(52, 52, 52, 0.72);
    cursor: pointer;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    user-select: none;
  }

  .search-filters input {
    width: 12px;
    height: 12px;
    accent-color: rgb(59, 181, 32);
  }

  .search-results {
    display: grid;
    gap: 4px;
    max-height: min(360px, calc(100vh - 180px));
    overflow: auto;
    border-top: 1px solid rgba(0, 26, 104, 0.1);
    padding: 8px;
  }

  .search-status {
    padding: 6px 4px;
    color: rgba(52, 52, 52, 0.58);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  .search-result {
    width: 100%;
    min-width: 0;
    border: 0;
    border-radius: calc(28px / var(--control-corner-ratio));
    background: transparent;
    display: grid;
    gap: 5px;
    padding: 8px;
    text-align: left;
    cursor: pointer;
  }

  .search-result:hover,
  .search-result:focus-visible {
    background: rgba(0, 26, 104, 0.06);
    outline: none;
  }

  .result-label {
    min-width: 0;
    overflow: hidden;
    color: rgb(52, 52, 52);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-source {
    min-width: 0;
    overflow: hidden;
    color: rgba(52, 52, 52, 0.62);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .result-tags span {
    min-width: 0;
    border: 1px solid rgba(0, 26, 104, 0.08);
    border-radius: calc(18px / var(--control-corner-ratio));
    background: rgba(52, 52, 52, 0.06);
    color: rgba(52, 52, 52, 0.62);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    padding: 4px 6px;
  }
</style>
