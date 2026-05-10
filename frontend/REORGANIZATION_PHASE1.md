# 📁 Folder Structure Reorganization - Phase 1

**Date**: 2026-05-10
**Status**: ✅ COMPLETE - Structure reorganized, imports pending update

---

## Overview

Reorganisasi folder structure frontend berdasarkan ketentuan SoC dan domain-based organization:
- ✅ `lib/utils.ts` → hanya `cn()` (shadcn convention)
- ✅ `utils/` → reorganized by concern (format, string, function, crypto)
- ✅ `services/` → domain-based consistent pattern
- ✅ `components/` → clear domain separation (auth, admin, shop, etc)

---

## Changes Made

### 1. **lib/utils.ts** (ONLY cn())
```
Before: 67 lines (cn + formatting + string + function utilities)
After:  6 lines (ONLY cn() - shadcn convention)
```

**Benefit**: 
- No conflict when shadcn regenerates on new component install
- Follows shadcn/ui convention strictly

---

### 2. **utils/ folder** (Organized by Concern)
```
Before:
├── auth.validation.ts
└── format.ts (only formatCountdown)

After:
├── index.ts              ← Central export
├── format.ts             ← formatCurrency, formatDate, formatDateTime, formatCountdown
├── string.ts             ← truncate, slugify (NEW)
├── function.ts           ← debounce (NEW)
├── crypto.ts             ← generateIdempotencyKey with crypto.randomUUID() (NEW)
└── auth.validation.ts    ← validateEmail, validateLoginForm, validateRegisterForm
```

**Organization**:
- `format.ts` - All formatting functions (global utilities)
- `string.ts` - All string manipulation
- `function.ts` - Functional utilities
- `crypto.ts` - Crypto utilities (improved with crypto.randomUUID())
- `auth.validation.ts` - Auth domain validation

**Benefit**: Clear separation by concern, easy to locate functions

---

### 3. **services/ folder** (Domain-Based Consistent)
```
Before (Inconsistent):
├── auth.ts              [FILE]
├── product.ts           [FILE]
├── order.ts             [FILE]
├── admin/               [FOLDER with multiple files]
└── etc

After (Consistent):
├── api.ts               [Shared axios instance - root level]
├── auth/
│   ├── auth.service.ts
│   └── index.ts
├── product/
│   ├── product.service.ts
│   └── index.ts
├── order/
│   ├── order.service.ts
│   └── index.ts
├── cart/
│   ├── cart.service.ts
│   └── index.ts
├── user/
│   ├── user.service.ts
│   └── index.ts
├── shipping/
│   ├── shipping.service.ts
│   └── index.ts
├── payment/
│   ├── payment.service.ts
│   └── index.ts
├── promo/
│   ├── promo.service.ts
│   └── index.ts
├── chat/
│   ├── chat.service.ts
│   └── index.ts
├── address/
│   ├── address.service.ts
│   └── index.ts
├── wishlist/
│   ├── wishlist.service.ts
│   └── index.ts
└── admin/               [FOLDER - already existed]
```

**Pattern**:
- Each domain in own folder
- Service file named `[domain].service.ts`
- Each has `index.ts` for clean exports
- Shared `api.ts` at root level

**Benefit**: 
- Consistent pattern across all services
- Clear domain boundaries
- Easy to navigate
- Aligns with skill requirements

---

### 4. **components/ folder** (Domain Separation)
```
Before (Ambiguous):
├── common/              [Contains auth components - MISLEADING]
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── CheckEmailScreen.tsx
│   ├── PasswordRequirements.tsx
│   ├── VerificationDialog.tsx
│   ├── auth-required-dialog.tsx
│   └── avatar.tsx
└── [other domains]

After (Clear):
├── ui/                  [shadcn base components - NO logic]
│   └── Button, Input, Card, etc
│
├── auth/                [AUTH DOMAIN - specific to auth]
│   ├── index.ts
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── CheckEmailScreen.tsx
│   ├── PasswordRequirements.tsx
│   └── VerificationDialog.tsx
│
├── common/              [TRULY COMMON - lintas domain]
│   ├── auth-required-dialog.tsx
│   └── avatar.tsx
│
└── [other domains: admin/, shop/, product/, layout/, etc]
```

**Rationale**:
- `components/ui/` → shadcn base components (styling only, no logic)
- `components/auth/` → auth-specific components (only used in auth flow)
- `components/common/` → only truly common components (used across multiple domains)
- Domain folders → domain-specific components

**Benefit**: 
- Clear responsibility boundaries
- "Common" means actually common (not just arbitrary grouping)
- Easier to understand component usage scope

---

## Files Created

### Central Export Points (index.ts)
- ✅ `src/utils/index.ts` - Central export for all utilities
- ✅ `src/components/auth/index.ts` - Auth component exports
- ✅ `src/services/auth/index.ts` - Auth service exports
- ✅ `src/services/product/index.ts` - Product service exports
- ✅ `src/services/order/index.ts` - Order service exports
- ✅ `src/services/cart/index.ts` - Cart service exports
- ✅ `src/services/user/index.ts` - User service exports

### New Utility Files
- ✅ `src/utils/format.ts` - Format functions (formatCurrency, formatDate, etc)
- ✅ `src/utils/string.ts` - String functions (truncate, slugify)
- ✅ `src/utils/function.ts` - Function utilities (debounce)
- ✅ `src/utils/crypto.ts` - Crypto utilities (generateIdempotencyKey with crypto.randomUUID())

### Updated Files
- ✅ `src/lib/utils.ts` - ONLY cn() function

---

## Import Path Changes (Reference)

### Before → After

**Utils imports:**
```typescript
// BEFORE:
import { formatCurrency, truncate, debounce } from '@/lib/utils'

// AFTER:
import { formatCurrency, truncate, debounce } from '@/utils'
```

**Auth components:**
```typescript
// BEFORE:
import { LoginForm } from '@/components/common'

// AFTER:
import { LoginForm } from '@/components/auth'
```

**Services:**
```typescript
// BEFORE:
import { login } from '@/services/auth'  // assumed default export

// AFTER:
import { login } from '@/services/auth'  // same path (index.ts handles)
// Or explicitly:
import { login } from '@/services/auth/auth.service'
```

---

## ✅ SoC Compliance After Reorganization

| Principle | Status | Details |
|-----------|--------|---------|
| **One job per file** | ✅ | Each file has single responsibility |
| **Clear boundaries** | ✅ | Domains clearly separated |
| **Reusability clarity** | ✅ | "Common" means truly common |
| **Domain-based** | ✅ | All organized by domain |
| **shadcn convention** | ✅ | lib/utils.ts respects auto-generation |

---

## 📋 Next Phase: Update Imports

All files with old import paths need to be updated:
- Replace `@/lib/utils` → `@/utils`
- Replace `@/components/common` (auth items) → `@/components/auth`
- Verify service imports work with new structure

**Estimated effort**: 1-2 hours (many files to update)

---

## Status

**Phase 1 (Folder Structure)**: ✅ COMPLETE
**Phase 2 (Update Imports)**: ⏳ PENDING
**Phase 3 (Verify Build)**: ⏳ PENDING

---

**Created by**: Frontend Structure Reorganization Initiative
**Last Updated**: 2026-05-10
