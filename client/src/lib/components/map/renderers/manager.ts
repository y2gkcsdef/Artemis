import type maplibregl from 'maplibre-gl'
import type { Sublayer } from '$lib/stores/timeline'
import { sublayerRenderers } from './registry'
import { resolveSublayer } from './resolveSublayer'
import type { ResolvedSublayer } from './types'

export function createRendererManager(map: maplibregl.Map) {
  const rendered = new Map<number, { sublayer: Sublayer; resolved: ResolvedSublayer }>()
  let version = 0

  async function renderSublayer(sublayer: Sublayer, currentVersion: number) {
    const resolved = await resolveSublayer(sublayer.id)

    if (currentVersion !== version) return

    const renderer = sublayerRenderers[resolved.type]

    await renderer.render({ map, sublayer, resolved })
    rendered.set(sublayer.id, { sublayer, resolved })
  }

  async function reconcile(activeSublayers: Sublayer[]) {
    version += 1
    const currentVersion = version
    const activeIds = new Set(activeSublayers.map(sublayer => sublayer.id))

    for (const [id, renderedSublayer] of rendered) {
      if (!activeIds.has(id)) {
        const renderer = sublayerRenderers[renderedSublayer.resolved.type]
        await renderer.remove({
          map,
          sublayer: renderedSublayer.sublayer,
          resolved: renderedSublayer.resolved
        })
        rendered.delete(id)
      }
    }

    for (const sublayer of activeSublayers) {
      if (!rendered.has(sublayer.id)) {
        await renderSublayer(sublayer, currentVersion)
      }
    }
  }

  async function clear() {
    version += 1

    for (const renderedSublayer of rendered.values()) {
      const renderer = sublayerRenderers[renderedSublayer.resolved.type]
      await renderer.remove({
        map,
        sublayer: renderedSublayer.sublayer,
        resolved: renderedSublayer.resolved
      })
    }

    rendered.clear()
  }

  return {
    reconcile,
    clear
  }
}
