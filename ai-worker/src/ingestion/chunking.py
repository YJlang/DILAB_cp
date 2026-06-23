"""마크다운 청킹 — 헤딩 기준 1차 분할 + 긴 섹션은 줄 단위 보조 분할.

한국어 sentence splitter 는 의존성 추가 부담이라 일단 char-based.
정확한 토큰 카운트가 필요해지면 huggingface tokenizer 로 보정 (M3 이후).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

MAX_CHUNK_CHARS = 500  # BGE-M3 한국어 토큰 비율 약 1자=1.5토큰 → ~750 토큰 안전


@dataclass
class Chunk:
    index: int
    text: str
    heading_path: str
    char_count: int


_HEADING_RE = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)


def _split_by_headings(body: str) -> list[tuple[str, str]]:
    """(heading, content) 쌍. 첫 헤딩 전 본문은 'prefix' 라벨."""
    splits: list[tuple[str, str]] = []
    last_end = 0
    last_heading = "prefix"
    for m in _HEADING_RE.finditer(body):
        before = body[last_end : m.start()].strip()
        if before:
            splits.append((last_heading, before))
        last_heading = m.group(2).strip()
        last_end = m.end()
    tail = body[last_end:].strip()
    if tail:
        splits.append((last_heading, tail))
    return splits


def _split_long(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    parts: list[str] = []
    buf: list[str] = []
    cur = 0
    for line in text.split("\n"):
        line_len = len(line) + 1
        if cur + line_len > max_chars and buf:
            parts.append("\n".join(buf).strip())
            buf = [line]
            cur = line_len
        else:
            buf.append(line)
            cur += line_len
    if buf:
        parts.append("\n".join(buf).strip())
    return [p for p in parts if p]


def chunk_markdown(body: str, max_chars: int = MAX_CHUNK_CHARS) -> list[Chunk]:
    chunks: list[Chunk] = []
    idx = 0
    for heading, content in _split_by_headings(body):
        for piece in _split_long(content, max_chars):
            chunks.append(
                Chunk(index=idx, text=piece, heading_path=heading, char_count=len(piece))
            )
            idx += 1
    return chunks
