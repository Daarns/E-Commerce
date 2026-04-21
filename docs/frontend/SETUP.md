# Frontend Setup & Deployment

## Prerequisites

- **Node.js**: 18.17 or higher ([Download](https://nodejs.org/))
- **npm**: 9+ or **yarn**: 3.6+
- **Git**: Latest version

## Local Development Setup

### 1. Navigate to Frontend

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000

# Application
NEXT_PUBLIC_APP_NAME=E-Commerce
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Application runs on: `http://localhost:3000`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler |
| `npm test` | Run Jest tests |

## Development Workflow

### 1. Development Mode
```bash
npm run dev
```
- Hot module reloading
- Fast refresh on code changes
- Development source maps
- Warning messages for issues

### 2. Build for Production
```bash
npm run build
npm run start
```

### 3. Code Quality
```bash
npm run lint
npm run type-check
npm test
```

## Project Structure Overview

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── stores/                 # Zustand state management
├── services/               # API service layer
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
├── public/                 # Static assets
├── styles/                 # Global styles
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local             # Local environment variables
```

## Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process (Linux/Mac)
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### API Connection Issues

1. Verify backend is running on `http://localhost:8080`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check browser console for network errors
4. Verify CORS headers in backend

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run build again
npm run build
```

### Hot Reload Not Working

```bash
# Clear cache and restart
npm run dev
```

## Performance Tips

- Use `next/image` for images
- Implement code splitting with dynamic imports
- Leverage Server Components where possible
- Use Zustand selectors to minimize re-renders
- Enable output file tracing in `next.config.js`

## Security Best Practices

- Keep dependencies updated: `npm audit fix`
- Use environment variables for sensitive data
- Never commit `.env.local`
- Enable HTTPS in production
- Set security headers in `next.config.js`
- Validate all user inputs

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
docker build -f docker/Dockerfile.frontend -t ecommerce-frontend:latest .
docker run -p 3000:3000 ecommerce-frontend:latest
```

### Manual Deploy
1. Build: `npm run build`
2. Export static: `next export` (if using static generation)
3. Deploy `out/` or `.next/` to your server

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [PATTERNS.md](./PATTERNS.md) for implementation patterns
- See [../../API.md](../../API.md) for backend API documentation
