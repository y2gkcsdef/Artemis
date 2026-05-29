import type maplibregl from 'maplibre-gl'

export function syncMapCameras(leftMap: maplibregl.Map, rightMap: maplibregl.Map) {
  let syncing = false

  function syncCamera(source: maplibregl.Map, target: maplibregl.Map) {
    if (syncing) return

    syncing = true
    target.jumpTo({
      center: source.getCenter(),
      zoom: source.getZoom(),
      bearing: source.getBearing(),
      pitch: source.getPitch()
    })
    syncing = false
  }

  const syncRight = () => syncCamera(leftMap, rightMap)
  const syncLeft = () => syncCamera(rightMap, leftMap)

  leftMap.on('move', syncRight)
  rightMap.on('move', syncLeft)
  syncCamera(leftMap, rightMap)

  return () => {
    leftMap.off('move', syncRight)
    rightMap.off('move', syncLeft)
  }
}
