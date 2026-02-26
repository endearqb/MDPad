# Markdown Theme Sources and Mapping (2026-02-26)

## Scope
- Goal: add `GitHub` and `Academic` markdown themes to MDPad.
- Strategy: local tokenized recreation in `src/styles.css`, not direct raw CSS import.

## Community / GitHub references
- `sindresorhus/github-markdown-css` (GitHub markdown baseline)
  - Repository: https://github.com/sindresorhus/github-markdown-css
  - Snapshot: about 8.8k stars on 2026-02-26.
- `edwardtufte/tufte-css` (academic reading typography baseline)
  - Repository: https://github.com/edwardtufte/tufte-css
  - Snapshot: about 6.4k stars on 2026-02-26.
- `jasonm23/markdown-css-themes` (multi-theme markdown reference)
  - Repository: https://github.com/jasonm23/markdown-css-themes
  - Snapshot: about 936 stars on 2026-02-26.

## MDPad mapping decisions
- `md-theme-github`
  - Match GitHub-like heading rhythm, table borders, blockquote, inline code, code block contrast.
  - Keep MDPad node-specific behavior unchanged.
- `md-theme-academic`
  - Use serif-first typography, narrower line length, higher line-height, lower saturation.
  - Keep editor interactions identical; styling only.

## Explicit non-goals
- No parser/codec behavior change.
- No direct dependency or full stylesheet vendoring from third-party repos.
- No changes to callout/math/media node semantics.
