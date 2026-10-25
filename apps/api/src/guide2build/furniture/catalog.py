"""Explicit reviewed product catalogue; never guesses source URLs."""
import json
import re
from pathlib import Path
from .models import Product, Tutorial

ROOT = Path(__file__).resolve().parents[5]
CONFIG = ROOT / "config/furniture/lack-30449908.json"
CONFIGS = {article: ROOT / f"config/furniture/lack-{article}.json"
           for article in ("30449908", "80104268", "70319028")}


def tutorial(article_number: str = "30449908") -> Tutorial:
    compact = article_number.replace(".", "")
    if not re.fullmatch(r"[0-9]{8}", compact):
        raise ValueError("Article number must contain eight digits")
    if compact not in CONFIGS:
        raise KeyError(article_number)
    return Tutorial.model_validate(json.loads(CONFIGS[compact].read_text()))


def product(article_number: str = "30449908") -> Product:
    return tutorial(article_number).product


def search(query: str = "") -> list[Product]:
    query = query.strip().lower()
    return [item for article in CONFIGS if (item := product(article)) and
            (not query or query.replace(".", "") == item.article_number or
             query in f"{item.name} {item.variant}".lower())]
