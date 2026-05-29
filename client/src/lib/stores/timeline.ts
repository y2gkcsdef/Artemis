import { derived, get, writable } from 'svelte/store'

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

export type TimelineSide = 'left' | 'right'
export type SublayerVisibilityOverrides = Record<number, boolean>

export const TIMELINE_MAX_TRACKS = 4
export const TIMELINE_LABEL_PADDING_YEARS = 3
export const TIMELINE_MIN_VISUAL_YEARS = 15

export const layers = writable<Layer[]>([])
export const timelineRange = writable<TimelineRange>({
  range_start: 1682,
  range_end: 1934
})

export const leftCurrentYear = writable<number>(1791)
export const rightCurrentYear = writable<number>(1791)
export const leftFocusedLayerLabel = writable<string | null>(null)
export const rightFocusedLayerLabel = writable<string | null>(null)
export const leftSublayerVisibilityOverrides = writable<SublayerVisibilityOverrides>({})
export const rightSublayerVisibilityOverrides = writable<SublayerVisibilityOverrides>({})

export const currentYear = leftCurrentYear
export const focusedLayerLabel = leftFocusedLayerLabel

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

function layersOverlap(a: TimelineLayerState, b: TimelineLayerState) {
  return a.visual_start_year <= b.visual_end_year && a.visual_end_year >= b.visual_start_year
}

function getFocusedLayer(timelineLayerRows: TimelineLayerState[], focusedLabel: string | null) {
  if (!focusedLabel) {
    return null
  }

  return timelineLayerRows.find(layer => layer.label === focusedLabel) ?? null
}

function getLayersUnderYear(timelineLayerRows: TimelineLayerState[], year: number) {
  return timelineLayerRows.filter(
    layer => layer.visual_start_year <= year && layer.visual_end_year >= year
  )
}

function getDeactivatedLayerLabelSet(
  timelineLayerRows: TimelineLayerState[],
  focusedLabel: string | null
) {
  const focusedLayer = getFocusedLayer(timelineLayerRows, focusedLabel)

  if (!focusedLayer) {
    return new Set<string>()
  }

  return new Set(
    timelineLayerRows
      .filter(layer => layer.label !== focusedLayer.label && layersOverlap(layer, focusedLayer))
      .map(layer => layer.label)
  )
}

function getActiveTimelineLayers(
  timelineLayerRows: TimelineLayerState[],
  year: number,
  focusedLabel: string | null
) {
  const layersUnderScrubber = getLayersUnderYear(timelineLayerRows, year)
  const focusedLayer = getFocusedLayer(timelineLayerRows, focusedLabel)

  if (!focusedLayer) {
    return layersUnderScrubber
  }

  return layersUnderScrubber.filter(
    layer => layer.label === focusedLayer.label || !layersOverlap(layer, focusedLayer)
  )
}

function getLayerCenterYear(layer: TimelineLayerState) {
  return Math.round((layer.visual_start_year + layer.visual_end_year) / 2)
}

export function isSublayerVisible(
  sublayer: Sublayer,
  visibilityOverrides: SublayerVisibilityOverrides
) {
  return visibilityOverrides[sublayer.id] ?? sublayer.default_visibility
}

function getVisibleSublayers(
  activeLayerRows: TimelineLayerState[],
  visibilityOverrides: SublayerVisibilityOverrides
) {
  return activeLayerRows.flatMap(layer =>
    layer.sublayers
      .filter(sublayer => isSublayerVisible(sublayer, visibilityOverrides))
      .toSorted((a, b) => a.sort_order - b.sort_order)
  )
}

export const leftDeactivatedLayerLabels = derived(
  [timelineLayers, leftFocusedLayerLabel],
  ([$timelineLayers, $focusedLayerLabel]) => {
    return getDeactivatedLayerLabelSet($timelineLayers, $focusedLayerLabel)
  }
)

export const rightDeactivatedLayerLabels = derived(
  [timelineLayers, rightFocusedLayerLabel],
  ([$timelineLayers, $focusedLayerLabel]) => {
    return getDeactivatedLayerLabelSet($timelineLayers, $focusedLayerLabel)
  }
)

export const deactivatedLayerLabels = leftDeactivatedLayerLabels

export const leftActiveLayers = derived(
  [timelineLayers, leftCurrentYear, leftFocusedLayerLabel],
  ([$timelineLayers, $currentYear, $focusedLayerLabel]) => {
    return getActiveTimelineLayers($timelineLayers, $currentYear, $focusedLayerLabel)
  }
)

export const rightActiveLayers = derived(
  [timelineLayers, rightCurrentYear, rightFocusedLayerLabel],
  ([$timelineLayers, $currentYear, $focusedLayerLabel]) => {
    return getActiveTimelineLayers($timelineLayers, $currentYear, $focusedLayerLabel)
  }
)

export const activeLayers = leftActiveLayers

export const leftActiveSublayers = derived(leftActiveLayers, $activeLayers =>
  $activeLayers.flatMap(layer =>
    layer.sublayers
      .filter(sublayer => sublayer.default_visibility)
      .toSorted((a, b) => a.sort_order - b.sort_order)
  )
)

export const rightActiveSublayers = derived(rightActiveLayers, $activeLayers =>
  $activeLayers.flatMap(layer =>
    layer.sublayers
      .filter(sublayer => sublayer.default_visibility)
      .toSorted((a, b) => a.sort_order - b.sort_order)
  )
)

export const activeSublayers = leftActiveSublayers

export function getCurrentYearStore(side: TimelineSide) {
  return side === 'left' ? leftCurrentYear : rightCurrentYear
}

export function getActiveLayersStore(side: TimelineSide) {
  return side === 'left' ? leftActiveLayers : rightActiveLayers
}

export function getActiveSublayersStore(side: TimelineSide) {
  return side === 'left' ? leftActiveSublayers : rightActiveSublayers
}

export function getSublayerVisibilityOverridesStore(side: TimelineSide) {
  return side === 'left' ? leftSublayerVisibilityOverrides : rightSublayerVisibilityOverrides
}

export function getDeactivatedLayerLabelsStore(side: TimelineSide) {
  return side === 'left' ? leftDeactivatedLayerLabels : rightDeactivatedLayerLabels
}

export function setSublayerVisibility(
  side: TimelineSide,
  sublayerId: number,
  visible: boolean
) {
  getSublayerVisibilityOverridesStore(side).update(overrides => ({
    ...overrides,
    [sublayerId]: visible
  }))
}

export function toggleSublayerVisibility(side: TimelineSide, sublayer: Sublayer) {
  const overrides = get(getSublayerVisibilityOverridesStore(side))
  setSublayerVisibility(side, sublayer.id, !isSublayerVisible(sublayer, overrides))
}

export function focusTimelineLayer(side: TimelineSide, layer: TimelineLayerState) {
  const layerCenterYear = getLayerCenterYear(layer)

  if (side === 'left') {
    leftFocusedLayerLabel.set(layer.label)
    leftCurrentYear.set(layerCenterYear)
    return
  }

  rightFocusedLayerLabel.set(layer.label)
  rightCurrentYear.set(layerCenterYear)
}

export function focusTimelineLayerNearScrubber(layer: TimelineLayerState) {
  const layerCenterYear = getLayerCenterYear(layer)
  const leftDistance = Math.abs(layerCenterYear - get(leftCurrentYear))
  const rightDistance = Math.abs(layerCenterYear - get(rightCurrentYear))
  const targetSide: TimelineSide = rightDistance < leftDistance ? 'right' : 'left'

  focusTimelineLayer(targetSide, layer)
}

export function clearTimelineLayerFocus(side: TimelineSide) {
  if (side === 'left') {
    leftFocusedLayerLabel.set(null)
    return
  }

  rightFocusedLayerLabel.set(null)
}

export function setTimelineYear(side: TimelineSide, year: number) {
  getCurrentYearStore(side).set(year)
}

export function copyLeftTimelineStateToRight() {
  const leftYear = get(leftCurrentYear)
  const { range_start, range_end } = get(timelineRange)
  const nextLeftYear = range_start < range_end ? Math.min(leftYear, range_end - 1) : leftYear

  leftCurrentYear.set(nextLeftYear)
  rightCurrentYear.set(Math.min(range_end, nextLeftYear + 1))
  rightFocusedLayerLabel.set(null)
}

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
