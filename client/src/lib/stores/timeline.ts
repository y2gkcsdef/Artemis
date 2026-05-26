import { derived, writable } from 'svelte/store'

export type SublayerType = 'wmts' | 'wms' | 'wfs' | 'iiif_tileserver' | 'parcel' | 'toponym'

export type Sublayer = {
  id: number
  layer_label: string
  label: string
  type: SublayerType
  source: string | null
  default_visibility: boolean
  sort_order: number
}

export type Layer = {
  label: string
  start_year: number
  end_year: number
  sublayers: Sublayer[]
}

export type TimelineLayerState = Layer & {
  track: number
  visual_start_year: number
  visual_end_year: number
}

export type TimelineRange = {
  range_start: number
  range_end: number
}

export const TIMELINE_MAX_TRACKS = 4
export const TIMELINE_LABEL_PADDING_YEARS = 3
export const TIMELINE_MIN_VISUAL_YEARS = 15

export const layers = writable<Layer[]>([])
export const timelineRange = writable<TimelineRange>({
  range_start: 1682,
  range_end: 1934
})

export const currentYear = writable<number>(1791)

export const timelineLayers = derived(layers, $layers => {
  const trackEnds = Array.from({ length: TIMELINE_MAX_TRACKS }, () => Number.NEGATIVE_INFINITY)

  return $layers.map(layer => {
    const labelYears = Math.ceil(layer.label.length * 1.4) + TIMELINE_LABEL_PADDING_YEARS
    const visualDuration = Math.max(
      layer.end_year - layer.start_year,
      TIMELINE_MIN_VISUAL_YEARS,
      labelYears
    )
    const visualEndYear = layer.start_year + visualDuration

    let assigned = -1

    for (let i = 0; i < trackEnds.length; i++) {
      if (layer.start_year > trackEnds[i]) {
        assigned = i
        break
      }
    }

    if (assigned === -1) {
      assigned = trackEnds.indexOf(Math.min(...trackEnds))
    }

    trackEnds[assigned] = visualEndYear

    return {
      ...layer,
      track: assigned,
      visual_start_year: layer.start_year,
      visual_end_year: visualEndYear
    }
  })
})

export const activeLayers = derived([timelineLayers, currentYear], ([$timelineLayers, $currentYear]) =>
  $timelineLayers.filter(
    layer => layer.visual_start_year <= $currentYear && layer.visual_end_year >= $currentYear
  )
)

export const activeSublayers = derived(activeLayers, $activeLayers =>
  $activeLayers.flatMap(layer =>
    layer.sublayers
      .filter(sublayer => sublayer.default_visibility)
      .toSorted((a, b) => a.sort_order - b.sort_order)
  )
)

async function fetchSublayers(layerLabel: string): Promise<Sublayer[]> {
  const response = await fetch(
    `http://localhost:3000/api/layers/${encodeURIComponent(layerLabel)}/sublayers`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch sublayers for ${layerLabel}`)
  }

  return response.json()
}

export async function fetchLayers() {
  const [layersRes, rangeRes] = await Promise.all([
    fetch('http://localhost:3000/api/layers'),
    fetch('http://localhost:3000/api/layers/range')
  ])

  if (!layersRes.ok) {
    throw new Error('Failed to fetch layers')
  }

  if (!rangeRes.ok) {
    throw new Error('Failed to fetch timeline range')
  }

  const layerRows = (await layersRes.json()) as Omit<Layer, 'sublayers'>[]
  const layersWithSublayers = await Promise.all(
    layerRows.map(async layer => ({
      ...layer,
      sublayers: await fetchSublayers(layer.label)
    }))
  )

  layers.set(layersWithSublayers)
  timelineRange.set(await rangeRes.json())
}
