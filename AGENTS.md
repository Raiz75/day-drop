<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# File Convention: AI-CONTEXT-NOTE

Every code file created or edited in this project MUST carry a token-efficient `AI-CONTEXT-NOTE` JSON header as the FIRST line of the file.

- Wrap the JSON in a comment matching the file language (`/* ... */` for TS/TSX, `#` for scripts, `<!-- -->` for HTML).
- The JSON MUST be one single line with NO spaces after `:`, `,`, `{`, or `}` (spaces inside string values are fine).
- Schema keys: `R` (role), `IDD` (important developer decisions), `A` (files that depend on this), `AB` (files/deps this depends on), `E` (what to verify on edit). Severity markers: `!`, `!!`, `!!!`, plus `?` informational and `*` extra checks; `CRITICAL` names what breaks.
- Never delete an existing note; update `R`/`A`/`AB`/`E` when purpose or dependencies change.
