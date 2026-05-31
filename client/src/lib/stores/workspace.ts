import { get, writable } from 'svelte/store'
import { copyLeftTimelineStateToRight, type TimelineSide } from '$lib/stores/timeline'

export type WorkspacePaneContent =
  | { kind: 'map' }
  | { kind: 'iiif-viewer'; manifest: string; label: string }

export type IiifViewerOverlay = {
  side: TimelineSide
  manifest: string
  label: string
  restoreSinglePaneOnClose: boolean
}

export type MapFocusRequest = {
  id: number
  side: TimelineSide
  lon: number
  lat: number
  zoom: number
}

export const workspaceSplitEnabled = writable(false)
export const mapCompareEnabled = writable(false)
export const leftPaneContent = writable<WorkspacePaneContent>({ kind: 'map' })
export const rightPaneContent = writable<WorkspacePaneContent>({ kind: 'map' })
export const iiifViewerOverlay = writable<IiifViewerOverlay | null>(null)
export const mapFocusRequest = writable<MapFocusRequest | null>(null)

export type IiifMaskSpriteSheet = 'gereduceerd' | 'primitief'

export type IiifMaskWindow = {
  id: number
  sourceSide: TimelineSide
  label: string
  manifest: string
  spriteSheet: IiifMaskSpriteSheet
  spriteX: number
  spriteY: number
  spriteWidth: number
  spriteHeight: number
  x: number
  y: number
}

type OpenIiifMaskWindowInput = Omit<IiifMaskWindow, 'spriteSheet'>

export const iiifMaskWindows = writable<IiifMaskWindow[]>([])

function getSpriteSheet(manifest: string): IiifMaskSpriteSheet {
  if (manifest.includes('primitief_kadaster')) return 'primitief'
  return 'gereduceerd'
}

export function openIiifMaskWindow(mask: OpenIiifMaskWindowInput) {
  const nextWindow: IiifMaskWindow = {
    ...mask,
    spriteSheet: getSpriteSheet(mask.manifest)
  }

  iiifMaskWindows.set([nextWindow])
}

export function closeIiifMaskWindow(id: number) {
  iiifMaskWindows.update(windows => windows.filter(window => window.id !== id))
}

export function clearIiifMaskWindows() {
  iiifMaskWindows.set([])
}

function resetPaneContent() {
  leftPaneContent.set({ kind: 'map' })
  rightPaneContent.set({ kind: 'map' })
  iiifViewerOverlay.set(null)
}

export function enableMapCompare() {
  if (!get(mapCompareEnabled)) {
    copyLeftTimelineStateToRight()
  }

  resetPaneContent()
  clearIiifMaskWindows()
  workspaceSplitEnabled.set(true)
  mapCompareEnabled.set(true)
}

export function disableMapCompare() {
  clearIiifMaskWindows()
  resetPaneContent()
  mapCompareEnabled.set(false)
  workspaceSplitEnabled.set(false)
}

export function toggleCompare() {
  if (get(mapCompareEnabled)) {
    disableMapCompare()
    return
  }

  enableMapCompare()
}

export function viewIiifMask(mask: IiifMaskWindow) {
  const viewerSide: TimelineSide = mask.sourceSide === 'right' ? 'left' : 'right'
  const wasSplit = get(workspaceSplitEnabled)

  iiifViewerOverlay.set({
    side: viewerSide,
    manifest: mask.manifest,
    label: mask.label,
    restoreSinglePaneOnClose: !wasSplit
  })

  clearIiifMaskWindows()
  workspaceSplitEnabled.set(true)
}

export function closeIiifViewer(side: TimelineSide) {
  const overlay = get(iiifViewerOverlay)

  if (overlay?.side !== side) return

  iiifViewerOverlay.set(null)

  if (overlay.restoreSinglePaneOnClose && !get(mapCompareEnabled)) {
    workspaceSplitEnabled.set(false)
  }
}

export function focusMapLocation({
  side,
  lon,
  lat,
  zoom = 13
}: {
  side: TimelineSide
  lon: number
  lat: number
  zoom?: number
}) {
  mapFocusRequest.set({
    id: Date.now(),
    side,
    lon,
    lat,
    zoom
  })
}
