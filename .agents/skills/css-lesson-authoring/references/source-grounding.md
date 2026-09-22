# Source-Grounded Curriculum Authoring

Use this process whenever the user provides files, notes, copied documentation, or a source-pack manifest as the basis for a Lesson or Exercise.

## Principle

Do not transform source files directly into final exercises.

Use:

```text
Source
→ grounded claims
→ learning outcomes
→ misconceptions
→ teaching flow
→ exercise objectives
→ authored content
```

## Source packs

A reusable source pack uses:

```json
{
  "schemaVersion": 1,
  "id": "css-flex-sizing",
  "scope": {
    "course": "css-foundations",
    "module": "flexbox",
    "lesson": "flex-sizing"
  },
  "sources": [
    {
      "id": "primary-reference",
      "path": "reference.md",
      "role": "primary",
      "notes": "Optional authoring note"
    }
  ]
}
```

Supported source roles:

- `primary`
- `supplemental`
- `internal`
- `example`

Supported text source formats:

- Markdown
- text
- JSON
- HTML
- CSS

Run `inspect-source-pack.mjs` before reading a reusable source pack. It validates paths, duplicate IDs, UTF-8, extensions, byte size, and SHA-256 hashes.

## Direct user-provided files

A source pack is optional. If the user directly provides one or more accessible text files:

1. treat those files as the active source set
2. inspect/read them before designing content
3. identify grounded claims and source locations
4. report contradictions or missing information instead of inventing facts
5. only create a reusable source-pack manifest when the user wants the sources committed for later authoring

Do not copy source prose into learner content unless brief quotation is genuinely needed and licensing allows it. Prefer explanation in the project's own teaching voice.

## Grounding brief

Before authoring, internally derive a brief containing:

- claim
- source ID/path
- relevant section or location if available
- teaching implication
- likely misconception
- possible learner observation

If two sources materially conflict, surface the conflict. Prefer a designated primary source for factual resolution, but do not silently rewrite conflicting internal guidance.

## Coverage

At completion, report which source IDs informed:

- major Lesson concepts
- Predict questions
- Exercise objectives
- checker decisions

This provenance is authoring metadata in the report; it does not need to appear in learner-facing content.
