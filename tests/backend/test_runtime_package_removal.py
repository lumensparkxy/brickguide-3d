"""Fail closed if Debian's removal plan expands beyond reviewed tools."""

import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "remove_unused_packages",
    Path(__file__).resolve().parents[2] / "deploy/furniture/remove_unused_packages.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_exact_purge_plan():
    module.validate_plan("Reading package lists...\nPurg login [1]\nPurg mount [2]\n")


@pytest.mark.parametrize("plan", [
    "", "Purg login [1]", "Purg login [1]\nPurg mount [2]\nRemv util-linux [3]",
    "Purg login [1]\nPurg mount [2]\nInst other [1]",
    "Purg login [1]\nPurg mount [2]\nConf other [1]",
    "Purg", "Purg login:amd64 [1]\nPurg mount [2]",
])
def test_unexpected_plan_rejected(plan):
    with pytest.raises(RuntimeError):
        module.validate_plan(plan)
