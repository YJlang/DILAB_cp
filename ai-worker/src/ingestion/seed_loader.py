"""data/seed/expert-reviews/<domain>/*.md 파일 로더 — YAML frontmatter + body 파싱."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass
class SeedDocument:
    path: Path
    metadata: dict[str, Any]
    body: str

    @property
    def title(self) -> str:
        return self.metadata.get("title", self.path.stem)

    @property
    def author(self) -> str | None:
        return self.metadata.get("author")

    @property
    def author_credibility(self) -> int | None:
        return self.metadata.get("credibility_score")

    @property
    def is_seed(self) -> bool:
        return bool(self.metadata.get("seed_data", False))


def _parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta = yaml.safe_load(parts[1]) or {}
    body = parts[2].lstrip("\n")
    return meta, body


def load_seed_documents(seed_dir: Path) -> list[SeedDocument]:
    docs: list[SeedDocument] = []
    for path in sorted(seed_dir.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(raw)
        docs.append(SeedDocument(path=path, metadata=meta, body=body))
    return docs
