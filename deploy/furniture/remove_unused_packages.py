"""Remove only the reviewed, non-Essential mount tool; never autoremove."""

import os
import subprocess


PACKAGES = frozenset({"mount"})


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
        for field in ("Essential", "Protected"):
            value = subprocess.check_output(
                ["dpkg-query", "-W", f"-f=${{{field}}}", package], text=True, env=env
            ).strip()
            if value not in {"", "no"}:
                raise RuntimeError(f"Refusing to remove {field} package: {package}")
    command = ["apt-get", "purge", "--yes", *packages]
    plan = subprocess.run([*command, "--simulate"], text=True, env=env, stdout=subprocess.PIPE)
    print(plan.stdout, flush=True)
    plan.check_returncode()
    validate_plan(plan.stdout)
    subprocess.run(command, check=True, env=env)
    subprocess.run(["apt-get", "check"], check=True, env=env)


if __name__ == "__main__":
    main()
