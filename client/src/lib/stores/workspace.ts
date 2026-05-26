import { writable } from 'svelte/store'

export const compareEnabled = writable(false)

export function enableCompare() {
  compareEnabled.set(true)
}

export function disableCompare() {
  compareEnabled.set(false)
}

export function toggleCompare() {
  compareEnabled.update(enabled => !enabled)
}
