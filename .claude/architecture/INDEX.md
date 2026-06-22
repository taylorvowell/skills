# Architecture decision records (`/architect`)

Durable, resumable records of `/architect` and `/architect-deep` calls. Each is self-contained: reopen and append to continue a thought. These are the *thinking record* — once a decision is accepted, promote it to a canonical ADR in `docs/decisions/` (see the `docs` skill).

This folder starts empty. Each `/architect` run writes a new dated file here, e.g.:

```
.claude/architecture/
└── <slug>-<YYYY-MM-DD>.md
```

and adds a one-line pointer to this index. The `architect` skill owns the format; don't hand-author entries here — let the skill do it so the structure stays consistent.

<!-- entries below this line -->
