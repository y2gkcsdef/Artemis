import type maplibregl from 'maplibre-gl'
import type { LayerSpecification, SourceSpecification } from 'maplibre-gl'
import type { SublayerRenderer } from './types'

type RemoteServiceData = {
  id: number
  sublayer_id: number
  type: 'wmts' | 'wms' | 'wfs'
  endpoint: string
}

const BELGIUM_BOUNDS: [number, number, number, number] = [2.53, 50.685, 5.92, 51.52]

async function fetchRemoteServiceData(sublayerId: number): Promise<RemoteServiceData> {
  const response = await fetch(`http://localhost:3000/api/remote-services/${sublayerId}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch remote service data for sublayer ${sublayerId}`)
  }

  return response.json()
}

function getSourceId(id: number) {
  return `remote-service-${id}`
}

function getLayerId(id: number, suffix = 'raster') {
  return `remote-service-${id}-${suffix}`
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

function addRasterService({
  map,
  id,
  tiles
}: {
  map: maplibregl.Map
  id: number
  tiles: string[]
}) {
  const sourceId = getSourceId(id)
  const layerId = getLayerId(id)

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'raster',
      tiles,
      tileSize: 256,
      bounds: BELGIUM_BOUNDS
    } satisfies SourceSpecification)
  }

  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId
    } satisfies LayerSpecification)
  }
}

function addWfsService({ map, id, data }: { map: maplibregl.Map; id: number; data: string }) {
  const sourceId = getSourceId(id)
  const fillLayerId = getLayerId(id, 'fill')
  const lineLayerId = getLayerId(id, 'line')
  const pointLayerId = getLayerId(id, 'point')

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data
    } satisfies SourceSpecification)
  }

  if (!map.getLayer(fillLayerId)) {
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': '#20b55c',
        'fill-opacity': 0.25
      }
    } satisfies LayerSpecification)
  }

  if (!map.getLayer(lineLayerId)) {
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'LineString']]],
      paint: {
        'line-color': '#20b55c',
        'line-width': 1.5
      }
    } satisfies LayerSpecification)
  }

  if (!map.getLayer(pointLayerId)) {
    map.addLayer({
      id: pointLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': '#20b55c',
        'circle-radius': 4,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1
      }
    } satisfies LayerSpecification)
  }
}

export const remoteServiceRenderer: SublayerRenderer = {
  async render({ map, sublayer, resolved }) {
    const remoteService = await fetchRemoteServiceData(sublayer.id)

    if (!remoteService.endpoint) {
      console.warn('[map-renderer] remote service has no endpoint', {
        id: sublayer.id,
        label: sublayer.label,
        type: resolved.type
      })
      return
    }

    if (resolved.type === 'wmts' || resolved.type === 'wms') {
      addRasterService({
        map,
        id: sublayer.id,
        tiles: [remoteService.endpoint]
      })
      return
    }

    if (resolved.type === 'wfs') {
      addWfsService({
        map,
        id: sublayer.id,
        data: remoteService.endpoint
      })
      return
    }

    console.warn('[map-renderer] unsupported remote service type', {
      id: sublayer.id,
      label: sublayer.label,
      type: resolved.type
    })
  },

  remove({ map, sublayer, resolved }) {
    const sourceId = getSourceId(sublayer.id)

    if (resolved.type === 'wfs') {
      removeLayerIfPresent({ map, layerId: getLayerId(sublayer.id, 'point') })
      removeLayerIfPresent({ map, layerId: getLayerId(sublayer.id, 'line') })
      removeLayerIfPresent({ map, layerId: getLayerId(sublayer.id, 'fill') })
      removeSourceIfPresent({ map, sourceId })
      return
    }

    removeLayerIfPresent({ map, layerId: getLayerId(sublayer.id) })
    removeSourceIfPresent({ map, sourceId })
  }
}
