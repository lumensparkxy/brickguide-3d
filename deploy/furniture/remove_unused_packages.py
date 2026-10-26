"""Remove only two reviewed, non-Essential runtime tools; never autoremove."""

import os
import subprocess


PACKAGES = frozenset({"login", "mount"})


def validate_plan(output: str) -> None:
    removed = set()
    for line in output.splitlines():
        fields = line.split()
        if not fields:
            continue
        if fields[0] in {"Inst", "Conf"}:
            raise RuntimeError("Unexpected installation/configuration in purge plan")
        if fields[0] in {"Remv", "Purg"}:
            if len(fields) < 2:
                raise RuntimeError("Malformed package removal plan")
            removed.add(fields[1])
    if removed != PACKAGES:
        raise RuntimeError(f"Unexpected purge plan: {sorted(removed)}")


def main() -> None:
    env = {**os.environ, "LC_ALL": "C", "DEBIAN_FRONTEND": "noninteractive"}
    packages = sorted(PACKAGES)
    for package in packages:
        essential = subprocess.check_output(
            ["dpkg-query", "-W", "-f=${Essential}", package], text=True, env=env
        ).strip()
        if essential not in {"", "no"}:
            raise RuntimeError(f"Refusing to remove Essential package: {package}")
    command = ["apt-get", "purge", "--yes", *packages]
    plan = subprocess.check_output([*command, "--simulate"], text=True, env=env)
    print(plan, flush=True)
    validate_plan(plan)
    subprocess.run(command, check=True, env=env)
    subprocess.run(["apt-get", "check"], check=True, env=env)


if __name__ == "__main__":
    main()
