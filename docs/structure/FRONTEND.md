# Frontend Structure

Frontend path:

```text
frontend/
```

The frontend is a Next.js App Router application with domain-based components, hook-based state orchestration, and a separate service layer for HTTP calls.

## Main Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand for client state
- Axios service layer
- Base UI/shadcn-style local UI components
- TanStack Query where needed

## Folder Map

```text
frontend/src/
├── app/          # Next.js routes and layouts
├── components/   # UI components by domain
├── constants/    # Shared labels, options, statuses, UI constants
├── hooks/        # State/effect/data orchestration
├── lib/          # Library setup and shadcn cn utility
├── services/     # API calls only
├── stores/       # Zustand stores
├── types/        # Shared TypeScript types
└── utils/        # Pure helpers and mappers
```

## Route Groups

```text
app/
├── (shop)/       # Customer storefront pages
├── admin/        # Admin dashboard pages
├── login/        # Auth pages
├── register/
└── ...
```

## Application Flow

Most feature flows follow this shape:

```text
page.tsx -> domain component -> hook -> service -> API
```

In practice:

- `app/` contains route entry points and layouts.
- `components/` contains domain UI.
- `hooks/` coordinates state, effects, debounce, pagination, and mutations.
- `services/` contains API calls.
- `types/`, `constants/`, and `utils/` hold shared contracts and helpers.

## Important Domain Areas

| Domain | Key folders |
|---|---|
| Product/catalog | `components/product`, `hooks/useProduct*`, `services/product`, `constants/product.constants.ts` |
| Cart/checkout | `components/cart`, `components/checkout`, `hooks/useCheckout*`, `services/cart`, `services/order` |
| Orders/refunds | `components/shop/order-*`, `hooks/useOrder*`, `services/order` |
| Admin | `components/admin`, `services/admin`, admin pages under `app/admin` |
| Chat | `components/chat`, `hooks/useChatWidget`, `stores/chat-store`, `services/chat` |
| Notifications | notification components/hooks/services |
| Auth | auth pages, auth store, auth service |

## Image Handling

Local product images may be stored as SeaweedFS S3 URLs on `localhost:8333`, but browser display uses the Filer path:

```text
http://localhost:8888/buckets/<bucket>/<object-path>
```

Shared image URL utilities normalize local storage URLs for display.

## Quality Checks

```powershell
cd frontend
npm run lint
npm run build
```

Use Playwright/Lighthouse only after backend, Postgres, Redis, and SeaweedFS are healthy.
