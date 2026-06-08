#!/usr/bin/env python3
"""Normalize toponym GeoJSON files into one import-ready file per layer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

from pyproj import Transformer


DEFAULT_DATA_ROOT = Path(__file__).resolve().parents[1]

LAYER_PATHS = {
    "ferraris": {
        "input_dir": Path("Ferraris") / "Toponyms",
        "output_path": Path("Toponyms") / "CLEAN" / "ferraris.geojson",
    },
    "primitief_kadaster": {
        "input_dir": Path("Primitief_Kadaster") / "Toponyms",
        "output_path": Path("Toponyms") / "CLEAN" / "primitief_kadaster.geojson",
    },
    "gereduceerd_kadaster": {
        "input_dir": Path("Gereduceerd_Kadaster") / "Toponyms",
        "output_path": Path("Toponyms") / "CLEAN" / "gereduceerd_kadaster.geojson",
    },
}

SOURCE_CRS = "EPSG:4326"
TARGET_CRS = "EPSG:4326"

Coord = list[float]
Ring = list[Coord]
PolygonCoords = list[Ring]
MultiPolygonCoords = list[PolygonCoords]


def transform_position(position: Iterable[float], transformer: Transformer) -> Coord:
    lon, lat, *rest = position
    x, y = transformer.transform(lon, lat)
    if rest:
        return [x, y, *rest]
    return [x, y]


def transform_geometry(geometry: dict[str, Any], transformer: Transformer) -> dict[str, Any]:
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    if geometry_type == "Polygon":
        transformed = [
            [transform_position(position, transformer) for position in ring]
            for ring in coordinates
        ]
    elif geometry_type == "MultiPolygon":
        transformed = [
            [
                [transform_position(position, transformer) for position in ring]
                for ring in polygon
            ]
            for polygon in coordinates
        ]
    else:
        raise ValueError(f"Unsupported geometry type: {geometry_type}")

    return {
        "type": geometry_type,
        "coordinates": transformed,
    }


def ring_area_and_centroid(ring: Ring) -> tuple[float, float, float]:
    area_twice = 0.0
    cx_factor = 0.0
    cy_factor = 0.0

    if len(ring) < 4:
        return 0.0, 0.0, 0.0

    for index in range(len(ring) - 1):
        x0, y0 = ring[index][:2]
        x1, y1 = ring[index + 1][:2]
        cross = x0 * y1 - x1 * y0
        area_twice += cross
        cx_factor += (x0 + x1) * cross
        cy_factor += (y0 + y1) * cross

    if area_twice == 0:
        return 0.0, 0.0, 0.0

    area = area_twice / 2.0
    return area, cx_factor / (3.0 * area_twice), cy_factor / (3.0 * area_twice)


def polygon_area_and_centroid(polygon: PolygonCoords) -> tuple[float, float, float]:
    total_area = 0.0
    weighted_x = 0.0
    weighted_y = 0.0

    for ring in polygon:
        area, cx, cy = ring_area_and_centroid(ring)
        total_area += area
        weighted_x += cx * area
        weighted_y += cy * area

    if total_area == 0:
        first_position = polygon[0][0]
        return 0.0, first_position[0], first_position[1]

    return total_area, weighted_x / total_area, weighted_y / total_area


def geometry_centroid(geometry: dict[str, Any]) -> dict[str, Any]:
    geometry_type = geometry["type"]
    coordinates = geometry["coordinates"]

    if geometry_type == "Polygon":
        _, x, y = polygon_area_and_centroid(coordinates)
    elif geometry_type == "MultiPolygon":
        total_area = 0.0
        weighted_x = 0.0
        weighted_y = 0.0

        for polygon in coordinates:
            area, cx, cy = polygon_area_and_centroid(polygon)
            total_area += area
            weighted_x += cx * area
            weighted_y += cy * area

        if total_area == 0:
            first_position = coordinates[0][0][0]
            x, y = first_position[0], first_position[1]
        else:
            x, y = weighted_x / total_area, weighted_y / total_area
    else:
        raise ValueError(f"Unsupported geometry type: {geometry_type}")

    return {
        "type": "Point",
        "coordinates": [x, y],
    }


def clean_feature(
    feature: dict[str, Any],
    transformer: Transformer,
    source_path: Path,
    feature_index: int,
) -> dict[str, Any]:
    properties = feature.get("properties") or {}
    text = properties.get("text")

    if text is None or str(text).strip() == "":
        raise ValueError(f"Missing text in {source_path} feature {feature_index}")

    geometry = transform_geometry(feature["geometry"], transformer)
    location = geometry_centroid(geometry)

    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "text": str(text).strip(),
            "location_x": location["coordinates"][0],
            "location_y": location["coordinates"][1],
        },
    }


def clean_layer(layer_name: str, input_dir: Path, output_path: Path) -> int:
    if not input_dir.is_dir():
        raise FileNotFoundError(f"Missing input directory for {layer_name}: {input_dir}")

    transformer = Transformer.from_crs(SOURCE_CRS, TARGET_CRS, always_xy=True)
    features: list[dict[str, Any]] = []

    for source_path in sorted(input_dir.glob("*.geojson")):
        if source_path == output_path or source_path.stem.upper() == "CLEAN":
            continue

        with source_path.open("r", encoding="utf-8") as handle:
            collection = json.load(handle)

        for index, feature in enumerate(collection.get("features", [])):
            features.append(clean_feature(feature, transformer, source_path, index))

    output = {
        "type": "FeatureCollection",
        "name": layer_name,
        "crs": {
            "type": "name",
            "properties": {
                "name": TARGET_CRS,
            },
        },
        "features": features,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")

    return len(features)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create one normalized EPSG:4326 toponym GeoJSON per layer."
    )
    parser.add_argument(
        "--data-root",
        type=Path,
        default=DEFAULT_DATA_ROOT,
        help="Root containing the source data directories (default: repository root).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data_root = args.data_root.expanduser().resolve()

    for layer_name, paths in LAYER_PATHS.items():
        input_dir = data_root / paths["input_dir"]
        output_path = data_root / paths["output_path"]
        count = clean_layer(layer_name, input_dir, output_path)
        print(f"{layer_name}: wrote {count} features to {output_path}")


if __name__ == "__main__":
    main()
