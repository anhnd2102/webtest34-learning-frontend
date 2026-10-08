# Domain Docs

Before exploring the codebase, read:

- `GLOSSARY.md` at the repository root, if present.
- Relevant ADRs under `docs/adr/`, if present.

Missing files should not block work. The domain-modeling workflow creates them when terminology or decisions are actually resolved.

## File structure

This repository uses a single-context layout:

/
├── GLOSSARY.md
├── docs/adr/
└── src/

Use terminology defined in `GLOSSARY.md`. If proposed work conflicts with an existing ADR, surface the conflict explicitly rather than silently overriding the decision.
