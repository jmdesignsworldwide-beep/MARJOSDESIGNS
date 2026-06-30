# Marjos Designs — Sistema

Sistema de gestión para **Marjos Designs S.R.L.** (imprenta + diseño gráfico).
Construido con Next.js 14 (App Router), TypeScript, Tailwind CSS y Framer Motion.

> **Tanda 1A — Cimientos.** Base técnica + sistema de diseño "Monster".
> Sin autenticación ni datos todavía: solo los cimientos visuales y técnicos.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** con tokens de tema (oscuro/claro)
- **Framer Motion** para las animaciones con alma
- **next-themes** para persistir el tema elegido
- **Supabase JS** (clientes listos; sin datos aún)

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
npm run lint     # ESLint (incluye no-console)
```

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores. En Vercel,
configúralas en **Project Settings → Environment Variables**:

| Variable | Ámbito | Notas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | URL pública del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente | Llave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | Marcar **Sensitive**. NUNCA con prefijo `NEXT_PUBLIC_`. NUNCA en chat/logs. |

`.env*` está en `.gitignore`. Cero secretos en el repo.

## Estructura

```
app/
  layout.tsx          # providers (tema, toasts, aurora) + fuente Inter
  page.tsx            # landing temporal → Showcase
  showcase/page.tsx   # página de revisión (temporal, se borra después)
components/
  ui/                 # primitivos: Button, Card, KpiCard, Field, Modal, Badge, Skeleton, Toast, Table
  layout/             # AppShell, Sidebar, MobileDrawer, Header, Logo, nav
  theme/              # ThemeProvider + ThemeToggle (sol/luna)
  motion/             # variants + Reveal (cascada con stagger)
  AuroraBackground.tsx
lib/
  utils.ts            # cn(), formatDOP(), formatNumber()
  hooks/useCountUp.ts # count-up con respeto a reduced-motion
  supabase/           # client (browser) + server (service-role, server-only)
```

## Sistema de diseño

- **Acento de marca:** dorado degradado (`#C8941E` → `#E0A82E` → `#F4C740`).
- **Carbón:** `#0D0D0D` → `#1A1A1A`.
- **Estados (señales, no marca):** azul = en proceso, verde = lista, rojo = vencida, gris = entregada.
- **Dos temas premium** con toggle persistente. Aurora dorada que respira en oscuro.
- Respeta `prefers-reduced-motion`.

## Seguridad

- Security headers (CSP, HSTS, X-Frame-Options, etc.) en `next.config.js`.
- `no-console` activo en ESLint.
- `service_role` solo en servidor (`lib/supabase/server.ts` marcado `server-only`).

> El logo real vive en `public/marjos-logo.jpeg` y se renderiza siempre como
> archivo — nunca se recrea ni aproxima.
