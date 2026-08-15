# Wireforge security model

## Local-only project storage

Wireforge stores saved harness projects in the user's browser through `localStorage` under `wireforge-projects-v1`. Project content is not sent to the Wireforge server. The application has no API routes, database integration, authentication, cookies, server actions, analytics, or project-sync service.

TOML import and SVG, PNG, and TOML export are performed in the browser. Imported project files are limited to 2 MB and validated against the versioned project schema before use. Browser saves are also schema-validated when loaded.

Browser storage is origin-scoped, but it is not encrypted. Anyone with access to the same browser profile or its developer tools may read locally saved projects. Clearing site data removes these saves unless the user exported a TOML backup.

## Hosting requirements

- Serve the production build over HTTPS.
- Preserve the security headers configured in `next.config.ts` at the reverse proxy.
- Do not add request logging that captures uploaded or exported project content.
- Do not introduce API routes or server persistence for project data without an explicit privacy and security review.
- Restrict deployment access and keep Node.js and dependencies patched.

## Reporting

Report vulnerabilities privately to the ArmoredTurtle maintainers rather than opening a public issue containing exploit details or sensitive project data.
