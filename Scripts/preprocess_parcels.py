#!/usr/bin/env python3
"""Normalize parcel GeoJSON files into one import-ready file per layer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_DATA_ROOT = Path(__file__).resolve().parents[1]

LAYER_PATHS = {
    "primitief_kadaster": {
        "input_dir": Path("Primitief_Kadaster") / "Parcels",
        "output_path": Path("Parcels") / "CLEAN" / "primitief_kadaster.geojson",
    },
}

TARGET_CRS = "EPSG:4326"


def parcel_text(properties: dict[str, Any]) -> str | None:
    value = properties.get("parcel_number")
    if value is not None and str(value).strip() != "":
        return str(value).strip()
    return None


def clean_feature(feature: dict[str, Any]) -> dict[str, Any] | None:
    properties = feature.get("properties") or {}
    if properties.get("type") != "parcel":
        return None

    geometry = feature.get("geometry")
    if not geometry or geometry.get("type") != "Polygon":
        raise ValueError(f"Unsupported parcel geometry type: {geometry}")

    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": {
            "text": parcel_text(properties),
        },
    }


def clean_layer(layer_name: str, input_dir: Path, output_path: Path) -> int:
    if not input_dir.is_dir():
        raise FileNotFoundError(f"Missing input directory for {layer_name}: {input_dir}")

    features: list[dict[str, Any]] = []

    for source_path in sorted(input_dir.glob("*.geojson")):
        with source_path.open("r", encoding="utf-8") as handle:
            collection = json.load(handle)

        for feature in collection.get("features", []):
            clean = clean_feature(feature)
            if clean is not None:
                features.append(clean)

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
        description="Create one normalized EPSG:4326 parcel GeoJSON per layer."
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
