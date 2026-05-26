import { writable } from 'svelte/store'

export type Layer = {
  label: string
  start_year: number
  end_year: number
}

export type TimelineRange = {
  range_start: number
  range_end: number
}

export const layers = writable<Layer[]>([])
export const timelineRange = writable<TimelineRange>({
  range_start: 1682,
  range_end: 1934
})

export const currentYear = writable<number>(1791)

export async function fetchLayers() {
  const [layersRes, rangeRes] = await Promise.all([
    fetch('http://localhost:3000/api/layers'),
    fetch('http://localhost:3000/api/layers/range')
  ])
  layers.set(await layersRes.json())
  timelineRange.set(await rangeRes.json())
}
