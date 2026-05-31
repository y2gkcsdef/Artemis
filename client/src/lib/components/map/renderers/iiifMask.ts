import type maplibregl from 'maplibre-gl'
import type { GeoJSONSource, LayerSpecification, SourceSpecification } from 'maplibre-gl'
import type { TimelineSide } from '$lib/stores/timeline'
import { openIiifMaskWindow } from '$lib/stores/workspace'

const SOURCE_PREFIX = 'iiif-mask'

type MaskHandlers = {
  onMouseMove: (event: maplibregl.MapLayerMouseEvent) => void
  onMouseLeave: (event: maplibregl.MapLayerMouseEvent) => void
  onClick: (event: maplibregl.MapLayerMouseEvent) => void
}

const registeredHandlers = new Map<number, MaskHandlers>()

async function fetchIiifMaskData(sublayerId: number): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(`http://localhost:3000/api/geojson/iiif-mask/${sublayerId}`)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch iiif-mask GeoJSON for sublayer ${sublayerId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    )
  }

  return response.json()
}

function getSourceId(id: number) {
  return `${SOURCE_PREFIX}-${id}`
}

function getHitLayerId(id: number) {
  return `${SOURCE_PREFIX}-${id}-hit`
}

function getOutlineLayerId(id: number) {
  return `${SOURCE_PREFIX}-${id}-outline`
}

function removeLayerIfPresent({ map, layerId }: { map: maplibregl.Map; layerId: string }) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId)
  }
}

function removeSourceIfPresent({ map, sourceId }: { map: maplibregl.Map; sourceId: string }) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }
}

function setHoveredMask({ map, layerId, maskId }: {
  map: maplibregl.Map
  layerId: string
  maskId: number | string | null
}) {
  map.setFilter(layerId, ['==', ['get', 'id'], maskId ?? -1])
}

function bindHoverHandlers({
  map,
  id,
  side,
  hitLayerId,
  outlineLayerId
}: {
  map: maplibregl.Map
  id: number
  side: TimelineSide
  hitLayerId: string
  outlineLayerId: string
}) {
  if (registeredHandlers.has(id)) return

  const handlers: MaskHandlers = {
    onMouseMove(event) {
      const hoveredFeature = event.features?.[0]
      const maskId = hoveredFeature?.properties?.id

      if (maskId === undefined || maskId === null) return

      map.getCanvas().style.cursor = 'pointer'
      setHoveredMask({ map, layerId: outlineLayerId, maskId })
    },

    onMouseLeave() {
      map.getCanvas().style.cursor = ''
      setHoveredMask({ map, layerId: outlineLayerId, maskId: null })
    },

    onClick(event) {
      const clickedFeature = event.features?.[0]
      const properties = clickedFeature?.properties

      if (!properties) return

      openIiifMaskWindow({
        id: Number(properties.id),
        sourceSide: side,
        label: String(properties.label ?? 'Untitled manifest'),
        manifest: String(properties.manifest ?? ''),
        spriteX: Number(properties.sprite_x),
        spriteY: Number(properties.sprite_y),
        spriteWidth: Number(properties.sprite_width),
        spriteHeight: Number(properties.sprite_height),
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY
      })
    }
  }

  map.on('mousemove', hitLayerId, handlers.onMouseMove)
  map.on('mouseleave', hitLayerId, handlers.onMouseLeave)
  map.on('click', hitLayerId, handlers.onClick)
  registeredHandlers.set(id, handlers)
}

function unbindHoverHandlers({
  map,
  id,
  hitLayerId
}: {
  map: maplibregl.Map
  id: number
  hitLayerId: string
}) {
  const handlers = registeredHandlers.get(id)

  if (!handlers) return

  map.off('mousemove', hitLayerId, handlers.onMouseMove)
  map.off('mouseleave', hitLayerId, handlers.onMouseLeave)
  map.off('click', hitLayerId, handlers.onClick)
  map.getCanvas().style.cursor = ''
  registeredHandlers.delete(id)
}

export async function renderIiifMask({ map, side, sublayerId }: {
  map: maplibregl.Map
  side: TimelineSide
  sublayerId: number
}) {
  const data = await fetchIiifMaskData(sublayerId)
  const sourceId = getSourceId(sublayerId)
  const hitLayerId = getHitLayerId(sublayerId)
  const outlineLayerId = getOutlineLayerId(sublayerId)
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined

  if (existingSource) {
    existingSource.setData(data)
  } else {
    map.addSource(sourceId, {
      type: 'geojson',
      data
    } satisfies SourceSpecification)
  }

  if (!map.getLayer(hitLayerId)) {
    map.addLayer({
      id: hitLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#000000',
        'fill-opacity': 0
      }
    } satisfies LayerSpecification)
  }

  if (!map.getLayer(outlineLayerId)) {
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['==', ['get', 'id'], -1],
      paint: {
        'line-color': '#0d5f57',
        'line-opacity': 0.95,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          0.8,
          14,
          1.6,
          17,
          2.6
        ]
      }
    } satisfies LayerSpecification)
  }

  bindHoverHandlers({ map, id: sublayerId, side, hitLayerId, outlineLayerId })
}

export function removeIiifMask({ map, sublayerId }: {
  map: maplibregl.Map
  sublayerId: number
}) {
  const sourceId = getSourceId(sublayerId)
  const hitLayerId = getHitLayerId(sublayerId)
  const outlineLayerId = getOutlineLayerId(sublayerId)

  unbindHoverHandlers({ map, id: sublayerId, hitLayerId })
  removeLayerIfPresent({ map, layerId: outlineLayerId })
  removeLayerIfPresent({ map, layerId: hitLayerId })
  removeSourceIfPresent({ map, sourceId })
}
