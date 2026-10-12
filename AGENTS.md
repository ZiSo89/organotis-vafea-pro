# AGENTS instructions for Nikol Paintmaster

## Project context
- This repository is a Greek-language business-management application for painters, shipped as a web app, an Electron desktop app, and a PWA.
- The primary frontend is vanilla JavaScript in [public/src/js](public/src/js) with styling in [public/src/css](public/src/css).
- Backend logic lives in [api](api), configuration in [config](config), and desktop-specific logic in [electron](electron).

## How to work productively here
- Prefer small, compatible changes. This codebase is not a framework-driven app, so keep edits explicit and easy to follow.
- Frontend modules are organized as global browser-side modules. Follow the existing pattern in [public/src/js/app.js](public/src/js/app.js) and [public/src/js/state.js](public/src/js/state.js) rather than introducing a new architecture.
- Reusable business logic should stay in [public/src/js/domain](public/src/js/domain) when it is shared across views.
- Backend changes should fit the existing PHP endpoint style in [api](api), especially [api/auth.php](api/auth.php) and [api/auth_check.php](api/auth_check.php).
- Respect the dual runtime model: web uses PHP/MySQL, while Electron uses SQLite locally and syncs via [electron/db](electron/db). Avoid breaking one path while fixing the other.

## Validation commands
- Run the project checks before finishing changes:
  - `npm run lint`
  - `npm run lint:php`
  - `npm run test`
  - `npm run test:unit`
  - `npm run build` for desktop packaging
- If the work touches authentication, secrets, or deployment behavior, review [DEPLOY.md](DEPLOY.md) and [config/secrets.php](config/secrets.php) first.

## Conventions and pitfalls
- This project uses runtime schema evolution rather than formal migrations; do not assume migration files are the primary workflow.
- Secrets and environment-specific configuration are handled through [config/secrets.php](config/secrets.php) and [config/secrets.local.php](config/secrets.local.php). Avoid hardcoding credentials.
- Keep the existing hash-based SPA routing and boot sequence intact unless a change explicitly requires otherwise.
- When implementing features, consult the docs in [docs/architecture.md](docs/architecture.md), [docs/database-and-api.md](docs/database-and-api.md), and [docs/ui-and-workflows.md](docs/ui-and-workflows.md) instead of duplicating knowledge in the instructions.

## Default approach
- Start by locating the relevant view, state handler, or API endpoint.
- Prefer extending existing modules over introducing parallel implementations.
- If the change affects both web and desktop behavior, design for the shared path first and only add runtime-specific adjustments when necessary.
