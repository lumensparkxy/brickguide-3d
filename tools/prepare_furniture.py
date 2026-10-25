"""Prepare the pinned LACK documents locally; never starts paid inference or publishes assets."""
import argparse
import json
from _paths import ROOT
from guide2build.furniture.source import prepare


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Fetch pinned official PDFs instead of using local copies")
    parser.add_argument("--article", default="30449908", help="Supported IKEA article number")
    args = parser.parse_args()
    receipts = prepare(ROOT / "var/furniture", None if args.download else ROOT / "var/furniture/sources", args.article)
    print(json.dumps({"status": "prepared", "documents": receipts}, indent=2))


if __name__ == "__main__":
    main()
