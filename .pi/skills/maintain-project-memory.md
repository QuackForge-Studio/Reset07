---
name: maintain-project-memory
description: Use when the user asks to update, refresh, or review project memory (AGENTS.md), or after significant project changes — new commands, new conventions, structure changes, or durable decisions that should persist across sessions.
---

# Maintain Project Memory

Update `AGENTS.md` at the project root — pi's project-memory file, loaded automatically at the start of every session.

## Procedure

1. Read the current `AGENTS.md`.
2. Collect durable facts from the session: new or changed commands/scripts, conventions, architectural decisions, gotchas, file-structure changes, brand rules.
3. Edit `AGENTS.md`:
   - Add facts as single concise lines; keep the file under ~150 lines.
   - Update stale entries **in place** — never stack duplicate lines for the same fact.
   - Use tables for command lists.
4. Skip transient detail: one-off bug fixes, session trivia, anything unlikely to matter in a future session.
5. Report to the user what changed, in one or two lines.

## Guardrails

- Never invent logo assets or brand facts that are not already in the repo.
- Never remove sections that are still accurate — prefer updating them.
- After editing, do not claim the file is verified unless you re-read the final result.
