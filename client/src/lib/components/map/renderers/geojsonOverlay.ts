import type maplibregl from 'maplibre-gl'
import type { GeoJSONSource, LayerSpecification, SourceSpecification } from 'maplibre-gl'

export type GeojsonDataset = 'parcel'

type OverlayStyle = {
  sourcePrefix: string
  fillColor: string
  fillOpacity: number
  lineColor: string
  lineOpacity: number
}

export async function fetchGeojsonData(
  dataset: GeojsonDataset,
  sublayerId: number
): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch(`http://localhost:3000/api/geojson/${dataset}/${sublayerId}`)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to fetch ${dataset} GeoJSON for sublayer ${sublayerId}: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    )
  }

  return response.json()
}

function getSourceId(prefix: string, id: number) {
  return `${prefix}-${id}`
}

function getLayerId(prefix: string, id: number, suffix: 'fill' | 'line') {
  return `${prefix}-${id}-${suffix}`
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

export function addGeojsonPolygonOverlay({
  map,
  id,
  data,
  style
}: {
  map: maplibregl.Map
  id: number
  data: GeoJSON.FeatureCollection
  style: OverlayStyle
}) {
  const sourceId = getSourceId(style.sourcePrefix, id)
  const fillLayerId = getLayerId(style.sourcePrefix, id, 'fill')
  const lineLayerId = getLayerId(style.sourcePrefix, id, 'line')
  const existingSource = map.getSource(sourceId) as GeoJSONSource | undefined

  if (existingSource) {
    existingSource.setData(data)
  } else {
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
      paint: {
        'fill-color': style.fillColor,
        'fill-opacity': style.fillOpacity
      }
    } satisfies LayerSpecification)
  }

  if (!map.getLayer(lineLayerId)) {
    map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': style.lineColor,
        'line-opacity': style.lineOpacity,
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          0.4,
          14,
          0.9,
          17,
          1.4
        ]
      }
    } satisfies LayerSpecification)
  }
}

export function removeGeojsonPolygonOverlay({
  map,
  id,
  sourcePrefix
}: {
  map: maplibregl.Map
  id: number
  sourcePrefix: string
}) {
  const sourceId = getSourceId(sourcePrefix, id)

  removeLayerIfPresent({ map, layerId: getLayerId(sourcePrefix, id, 'line') })
  removeLayerIfPresent({ map, layerId: getLayerId(sourcePrefix, id, 'fill') })
  removeSourceIfPresent({ map, sourceId })
}
