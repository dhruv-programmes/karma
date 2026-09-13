# Git Push Policy

## Critical Rule
- **NEVER run `git push` unless the user EXPLICITLY commands it.**
- Making code edits, formatting, refactoring, or running local tests must NEVER automatically trigger a `git push`.
- Only execute `git push` when the user writes an explicit prompt like "push", "push to main", or "push to remote".
