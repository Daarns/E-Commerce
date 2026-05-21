# Frontend Architecture

## Overview

The frontend is built with **Next.js 14** using modern React patterns. The architecture emphasizes modularity, type safety (TypeScript), and scalable component organization.

## Core Principles

- **Component-Based**: Reusable, single-responsibility components
- **Type-Safe**: Full TypeScript coverage
- **Server-First**: Leverage Next.js Server Components where possible
- **State Management**: Zustand for global state
- **API Abstraction**: Axios interceptors for consistent API calls
- **Styling**: Tailwind CSS with shadcn/ui components

## Architecture Layers

### 1. **Pages Layer** (Routing & Layout)
- Next.js App Router pages
- Layout definitions
- Route organization
- **Location**: `app/`

### 2. **Components Layer**
- **Page Components**: Full page implementations
- **Feature Components**: Domain-specific UI (product, cart, order)
- **Shared Components**: Reusable UI elements (buttons, forms, modals)
- **Location**: `components/`

### 3. **Services Layer** (API Integration)
- API client configuration
- HTTP interceptors (auth, error handling)
- Service methods for backend communication
- **Location**: `services/`

### 4. **Stores Layer** (State Management)
- Zustand stores for global state
- UI state (modals, notifications)
- User data (auth, preferences)
- **Location**: `stores/`

### 5. **Hooks Layer** (Custom Logic)
- Reusable React hooks
- Custom state management hooks
- Effect/lifecycle hooks
- **Location**: `hooks/`

### 6. **Types Layer** (Type Definitions)
- TypeScript interfaces
- API response types
- Component prop types
- **Location**: `types/`

### 7. **Utils Layer** (Helpers)
- Utility functions
- Formatters & converters
- Validators
- **Location**: `utils/`

## Directory Structure

```
frontend/
├── app/                               # Next.js App Router
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Home page
│   ├── (auth)/                        # Auth pages group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (shop)/                        # Shop pages group
│   │   ├── products/page.tsx
│   │   ├── product/[id]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── wishlist/page.tsx
│   │   └── layout.tsx
│   └── (admin)/                       # Admin pages group
│       ├── dashboard/page.tsx
│       └── layout.tsx
│
├── components/                        # Reusable components
│   ├── product/                       # Product domain
│   │   ├── product-card.tsx
│   │   ├── product-grid.tsx
│   │   ├── product-detail.tsx
│   │   └── wishlist-button.tsx
│   ├── cart/                          # Cart domain
│   │   ├── cart-item.tsx
│   │   └── cart-summary.tsx
│   ├── order/                         # Order domain
│   │   ├── order-item.tsx
│   │   └── order-list.tsx
│   ├── auth/                          # Auth domain
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── shared/                        # Shared UI components
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   └── modal.tsx
│   ├── forms/                         # Form components
│   │   ├── form-field.tsx
│   │   └── error-display.tsx
│   └── layout/
│       ├── header.tsx
│       └── footer.tsx
│
├── stores/                            # Zustand stores
│   ├── auth-store.ts                  # User auth state
│   ├── cart-store.ts                  # Shopping cart state
│   ├── wishlist-store.ts              # Wishlist state
│   ├── product-store.ts               # Product filters state
│   ├── ui-store.ts                    # UI state (modals, etc)
│   └── notification-store.ts          # Toast notifications
│
├── services/                          # API services
│   ├── api.ts                         # Axios instance & interceptors
│   ├── auth.ts                        # Auth endpoints
│   ├── product.ts                     # Product endpoints
│   ├── cart.ts                        # Cart endpoints
│   ├── order.ts                       # Order endpoints
│   └── user.ts                        # User profile endpoints
│
├── hooks/                             # Custom React hooks
│   ├── use-auth.ts                    # Auth hook
│   ├── use-cart.ts                    # Cart hook
│   ├── use-wishlist.ts                # Wishlist hook
│   ├── use-product-filters.ts         # Product filter hook
│   └── use-notifications.ts           # Notification hook
│
├── types/                             # TypeScript definitions
│   ├── index.ts                       # Central type exports
│   ├── api.ts                         # API response types
│   ├── models.ts                      # Domain models
│   ├── forms.ts                       # Form input types
│   └── ui.ts                          # UI component props
│
├── utils/                             # Utility functions
│   ├── formatters.ts                  # Format price, date, etc
│   ├── validators.ts                  # Input validation
│   ├── constants.ts                   # App constants
│   └── helpers.ts                     # General helpers
│
├── public/                            # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── styles/                            # Global styles
│   ├── globals.css                    # Tailwind imports
│   └── variables.css                  # CSS custom properties
│
├── .env.example                       # Environment template
├── .env.local                         # Local environment (git-ignored)
├── package.json
├── next.config.js
└── tsconfig.json
```

## Key Patterns

### State Management (Zustand)

```typescript
// stores/cart-store.ts
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
    total: state.total + item.price,
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id),
  })),
}));
```

### API Service Layer

```typescript
// services/product.ts
import { api } from './api';
import { Product, ApiResponse } from '@/types';

export const productService = {
  async getProducts(
    page: number = 1,
    limit: number = 10,
    category?: string
  ): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(
      '/products',
      { params: { page, limit, category } }
    );
    return response.data.data || [];
  },

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(
      `/products/${id}`
    );
    return response.data.data!;
  },
};
```

### Custom Hooks

```typescript
// hooks/use-wishlist.ts
import { useCallback } from 'react';
import { useWishlistStore } from '@/stores/wishlist-store';
import { productService } from '@/services/product';

export function useWishlist(productId: string) {
  const { items, addItem, removeItem } = useWishlistStore();
  
  const isWishlisted = items.some(item => item.id === productId);
  
  const toggle = useCallback(async () => {
    try {
      if (isWishlisted) {
        await productService.removeFromWishlist(productId);
        removeItem(productId);
      } else {
        await productService.addToWishlist(productId);
        addItem(productId);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
    }
  }, [isWishlisted, productId]);
  
  return { isWishlisted, toggle };
}
```

## Component Organization

### Feature Components
Located in feature subdirectories with related logic:
- `components/product/` - Product listing, details, cards
- `components/cart/` - Cart operations
- `components/order/` - Order display & tracking
- `components/auth/` - Authentication forms

### Shared Components
Reusable UI components from shadcn/ui:
- `components/shared/button.tsx`
- `components/shared/dialog.tsx`
- `components/shared/input.tsx`
- `components/shared/select.tsx`

## Data Flow

```
User Interaction
    ↓
Component Handler
    ↓
Zustand Store (optimistic update)
    ↓
API Service Call
    ↓
Backend API
    ↓
Store Update (confirmation)
    ↓
Component Re-render
```

## Configuration

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=E-Commerce
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### TypeScript

- Strict mode enabled
- No implicit any
- Strict null checks

## Performance Optimizations

- **Code Splitting**: Automatic with Next.js routes
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Dynamic imports for heavy components
- **Memoization**: React.memo for expensive components
- **Zustand**: Selector-based subscriptions for minimal re-renders

## Testing Strategy

- Unit tests for utilities & hooks (Jest)
- Component tests with React Testing Library
- E2E tests with Playwright
- API mocking with MSW

## Error Handling

- API interceptors catch common errors
- Toast notifications for user feedback
- Error boundaries for component crashes
- Validation at form input level

## Security Practices

- XSS prevention: Sanitize user input
- CSRF: Token-based requests
- Authentication: Secure token storage
- Authorization: Role-based page access
- HTTPS: Always in production

## Next Steps

- See [SETUP.md](./SETUP.md) for local setup
- See [../../API.md](../../API.md) for backend API docs
