# Automated Test Suite

The suite is split by responsibility:

- `unit/`: pure frontend utility and transformation tests with Vitest.
- `api/`: Playwright API black-box smoke, authorization, IDOR, pagination, and edge tests.
- `e2e/`: browser smoke for storefront, auth guards, SEO, and responsive layouts.
- `support/`: typed environment and API helpers shared by the suites.

## Commands

```powershell
cd frontend
npm run test:unit
npm run test:api
npm run test:e2e
```

Run all quality gates:

```powershell
npm run test:all
```

The API suite expects the backend on `http://127.0.0.1:8080`. The browser suite reuses the frontend on `http://localhost:3000`, or starts the standalone build there when the port is free.

## Optional Authenticated Coverage

Set dedicated local or staging test accounts before running authenticated API tests:

```powershell
$env:TEST_CUSTOMER_EMAIL='customer.test@example.com'
$env:TEST_CUSTOMER_PASSWORD='replace-with-test-password'
$env:TEST_SECOND_CUSTOMER_EMAIL='customer.two.test@example.com'
$env:TEST_SECOND_CUSTOMER_PASSWORD='replace-with-test-password'
$env:TEST_ADMIN_EMAIL='admin.test@example.com'
$env:TEST_ADMIN_PASSWORD='replace-with-test-password'
npm run test:api
```

Never point mutation-capable test credentials at production. Tests skip authenticated scenarios when credentials are absent.

Optional URL overrides:

```powershell
$env:TEST_API_URL='http://127.0.0.1:8080/api/v1'
$env:TEST_BACKEND_URL='http://127.0.0.1:8080'
$env:TEST_FRONTEND_URL='http://localhost:3000'
```
