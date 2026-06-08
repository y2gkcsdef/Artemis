#!/usr/bin/env python3
"""Match IIIF mask footprints to sprite atlas rectangles."""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

from osgeo import ogr
from pyproj import Transformer


DEFAULT_DATA_ROOT = Path(__file__).resolve().parents[1]
ogr.UseExceptions()

LAYER_PATHS = {
    "gereduceerd_kadaster": {
        "input_dir": Path("Gereduceerd_Kadaster") / "manifests",
        "sprite_index": Path("Gereduceerd_Kadaster") / "Sprites" / "sprites.json",
        "output_path": Path("IIIFMask") / "CLEAN" / "gereduceerd_kadaster.geojson",
        "report_path": Path("IIIFMask") / "CLEAN" / "gereduceerd_kadaster_match_report.json",
    },
}

SOURCE_CRS = "EPSG:31370"
TARGET_CRS = "EPSG:4326"

Coord = list[float]


def transform_position(position: Iterable[float], transformer: Transformer) -> Coord:
    x, y, *rest = position
    lon, lat = transformer.transform(x, y)
    if rest:
        return [lon, lat, *rest]
    return [lon, lat]


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
        raise ValueError(f"Unsupported IIIF mask geometry type: {geometry_type}")

    return {
        "type": geometry_type,
        "coordinates": transformed,
    }


def normalized_sprite_name(image_id: str) -> str:
    name = image_id.rsplit(":", 1)[-1].strip()
    name = re.sub(r"_[0-9]{4}_*$", "", name)
    name = re.sub(r"_[0-9]+_[0-9]+_?$", "", name)
    return name.strip("_")


def load_sprite_groups(sprite_index: Path) -> dict[str, list[dict[str, Any]]]:
    with sprite_index.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, dict):
        raise ValueError(f"Expected sprite index object in {sprite_index}")

    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for sprite_key, sprite in data.items():
        image_id = sprite.get("imageId")
        if not image_id:
            raise ValueError(f"Missing imageId for sprite {sprite_key}")

        groups[normalized_sprite_name(image_id)].append(
            {
                "sprite_key": sprite_key,
                "image_id": image_id,
                "x": sprite["x"],
                "y": sprite["y"],
                "width": sprite["width"],
                "height": sprite["height"],
            }
        )

    for sprites in groups.values():
        sprites.sort(key=lambda item: item["image_id"])

    return groups


def load_mask_groups(input_dir: Path) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for source_path in sorted(input_dir.glob("*_mask.shp")):
        dataset = ogr.Open(str(source_path))
        if dataset is None:
            raise ValueError(f"Could not open shapefile {source_path}")

        layer = dataset.GetLayer(0)
        layer_defn = layer.GetLayerDefn()
        field_names = [
            layer_defn.GetFieldDefn(index).GetName()
            for index in range(layer_defn.GetFieldCount())
        ]

        for index, source_feature in enumerate(layer):
            properties = {
                field_name: source_feature.GetField(field_name)
                for field_name in field_names
            }
            manifest = properties.get("manifest")
            manifest_url = properties.get("manifest_url") or properties.get("manifest_u")
            if not manifest or not manifest_url:
                raise ValueError(f"Missing manifest metadata in {source_path} feature {index}")

            geometry = source_feature.GetGeometryRef()
            if geometry is None:
                raise ValueError(f"Missing geometry in {source_path} feature {index}")

            groups[manifest].append(
                {
                    "source_file": source_path.name,
                    "source_feature_index": index,
                    "manifest": manifest,
                    "manifest_url": manifest_url,
                    "geometry": json.loads(geometry.ExportToJson()),
                }
            )

    return groups


def validate_groups(
    mask_groups: dict[str, list[dict[str, Any]]],
    sprite_groups: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    names = sorted(set(mask_groups) | set(sprite_groups))
    count_mismatches = [
        {
            "name": name,
            "mask_count": len(mask_groups.get(name, [])),
            "sprite_count": len(sprite_groups.get(name, [])),
        }
        for name in names
        if len(mask_groups.get(name, [])) != len(sprite_groups.get(name, []))
    ]

    return {
        "mask_feature_count": sum(len(items) for items in mask_groups.values()),
        "sprite_entry_count": sum(len(items) for items in sprite_groups.values()),
        "duplicate_groups": {
            name: len(mask_groups[name])
            for name in names
            if len(mask_groups.get(name, [])) > 1
        },
        "mask_only": [name for name in names if name in mask_groups and name not in sprite_groups],
        "sprite_only": [name for name in names if name in sprite_groups and name not in mask_groups],
        "count_mismatches": count_mismatches,
    }


def clean_layer(
    layer_name: str,
    input_dir: Path,
    sprite_index: Path,
    output_path: Path,
    report_path: Path,
) -> tuple[int, dict[str, Any]]:
    if not input_dir.is_dir():
        raise FileNotFoundError(f"Missing input directory for {layer_name}: {input_dir}")
    if not sprite_index.is_file():
        raise FileNotFoundError(f"Missing sprite index for {layer_name}: {sprite_index}")

    transformer = Transformer.from_crs(SOURCE_CRS, TARGET_CRS, always_xy=True)
    mask_groups = load_mask_groups(input_dir)
    sprite_groups = load_sprite_groups(sprite_index)
    report = validate_groups(mask_groups, sprite_groups)

    if report["count_mismatches"]:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        with report_path.open("w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=True, indent=2)
            handle.write("\n")
        raise ValueError(f"Mask/sprite count mismatch; see {report_path}")

    features: list[dict[str, Any]] = []
    matches: list[dict[str, Any]] = []

    for name in sorted(mask_groups):
        masks = mask_groups[name]
        sprites = sprite_groups[name]
        for ordinal, (mask, sprite) in enumerate(zip(masks, sprites, strict=True), start=1):
            features.append(
                {
                    "type": "Feature",
                    "geometry": transform_geometry(mask["geometry"], transformer),
                    "properties": {
                        "manifest": mask["manifest_url"],
                        "title": mask["manifest"],
                        "sprite_x": sprite["x"],
                        "sprite_y": sprite["y"],
                        "sprite_width": sprite["width"],
                        "sprite_height": sprite["height"],
                    },
                }
            )
            matches.append(
                {
                    "title": name,
                    "ordinal": ordinal,
                    "source_file": mask["source_file"],
                    "source_feature_index": mask["source_feature_index"],
                    "sprite_key": sprite["sprite_key"],
                    "image_id": sprite["image_id"],
                }
            )

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

    report["matches"] = matches
    report["source_crs"] = SOURCE_CRS
    report["target_crs"] = TARGET_CRS

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=True, separators=(",", ":"))
        handle.write("\n")

    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=True, indent=2)
        handle.write("\n")

    return len(features), report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create normalized EPSG:4326 IIIF mask GeoJSON with sprite rectangles."
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
        config = {name: data_root / path for name, path in paths.items()}
        count, report = clean_layer(layer_name, **config)
        print(f"{layer_name}: wrote {count} features to {config['output_path']}")
        print(f"{layer_name}: wrote match report to {config['report_path']}")
        if report["duplicate_groups"]:
            print(f"{layer_name}: duplicate groups matched by order: {report['duplicate_groups']}")


if __name__ == "__main__":
    main()
