import { get, writable } from 'svelte/store'
import { copyLeftTimelineStateToRight } from '$lib/stores/timeline'

export const compareEnabled = writable(false)

export function enableCompare() {
  if (!get(compareEnabled)) {
    copyLeftTimelineStateToRight()
  }

  compareEnabled.set(true)
}

export function disableCompare() {
  compareEnabled.set(false)
}

export function toggleCompare() {
  if (get(compareEnabled)) {
    disableCompare()
    return
  }

  enableCompare()
}
