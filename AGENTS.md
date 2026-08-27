# VIEWBID / VISIBILITY MARKETPLACE — AGENT RULES

Before changing this repository, read:

VIEWBID_DEVELOPMENT_SAFETY_GUIDELINES.md

MANDATORY RULES

1. Work on `chatgpt-dev` or a feature/fix branch.
2. Do not directly modify or push `main`.
3. Do not force-push or rewrite Git history.
4. Do not delete this repository.
5. Do not delete other repositories.
6. Do not perform bulk file deletion without explicit approval.
7. Do not delete or reset Firebase/Firestore data.
8. Do not run destructive Firebase, Firestore or GCP database commands.
9. Do not deploy destructive migrations without explicit approval.
10. Do not expose, delete or rotate credentials/secrets without explicit approval.
11. Inspect current code before editing.
12. Validate TypeScript/build before commit.
13. Critical payment/ranking/database writes must be authenticated, authorized,
    server-validated, atomic where practical, idempotent and auditable.
14. Never trust browser-reported payment success for ranking or entitlement.
15. Production data deletion always requires specific user approval.

Preferred flow:

read
→ branch
→ edit
→ validate
→ commit
→ push development branch
→ test
→ Pull Request
→ merge to main

Do not bypass these rules merely because repository write permission exists.
