# Frontend Documentation

Frontend app path:

```text
frontend/
```

## Read These

| Document | Purpose |
|---|---|
| [Structure](../structure/FRONTEND.md) | Folder boundaries and frontend separation of concerns |
| [Setup](../setup/README.md#3-configure-frontend) | Local frontend setup |
| [Environment](../setup/ENVIRONMENT.md#frontend) | Frontend environment variables |
| [Testing](../testing/README.md#frontend-checks) | Lint/build/browser checks |
| [Troubleshooting](../troubleshooting/README.md) | Common local frontend/browser issues |

## Common Commands

```powershell
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

## Docker Image

```powershell
docker build -f frontend/Dockerfile -t store-frontend:local frontend
```

The image uses Next.js standalone output and runs on port `3000`.

## Frontend Notes

- The frontend uses Next.js App Router with domain-based components.
- State, API calls, reusable constants, and pure helpers are separated across `hooks`, `services`, `constants`, and `utils`.
- Storefront and admin pages are documented through the structure guide.
