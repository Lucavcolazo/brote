# Brote 🌱

App web mobile (PWA) para dos: cada día cada uno sube una foto de la fruta o verdura que comió.
Si alguien pasa un día sin subir nada (o el otro le rechaza la foto), **el otro suma 1 punto**. Los puntos se canjean en la tienda.

- **Marcador**: los dos personajes grandes con sus puntos y racha. Reaccionan a lo que pasa: festejan cuando cumplen el día o suman puntos, el otro te hace 👍 cuando te aprueba la foto, se ponen nerviosos desde las 20:00 si no subieron nada, y si los tocás hacen un gesto. Abajo, quién cumplió hoy y el feed de fotos. El otro marca cada foto como "Vale" o "No cuenta".
- **Tienda**: cada uno carga su propia lista de premios (prendas que ofrece). Solo quien la cargó la edita o la borra; la pareja la ve y la canjea con sus puntos. Al canjear, al dueño le llega un aviso y queda "pendiente" hasta que lo cumple.
- **Notas**: cada uno carga la nota de un examen (materia y nota de 0 a 10). La pareja la revisa ("Vale" / "No cuenta"). Si vale: **6 o más, +1 punto para vos; menos de 6, +1 punto para tu pareja**. Se puede revisar o cambiar hasta las 8:00 del día siguiente; si nadie la revisó, en ese cierre se aprueba sola.
- **Semana**: rachas (actual y mejor), calendario de la semana, álbum (cada fruta y verdura distinta que comió cada uno, sacada de lo que escriben en las fotos), resúmenes y movimientos de puntos.
- **Config**: editor de avatar (forma, color, ojos, boca, cabeza, cara con cachetes y pecas, y manos con gestos animados como los emojis), nombre, idioma (Español / Português BR) y notificaciones.

## Cómo funciona el tiempo (hora argentina)

| Cuándo | Qué pasa |
|---|---|
| Todos los días 12:30 | Recordatorio a quien no subió nada |
| Todos los días 19:00 | Aviso a quien tiene un canje sin cumplir hace 3 días o más |
| Todos los días 21:30 | "Última llamada" |
| Todos los días 23:15 | "Te quedan 45 minutos" |
| Todos los días 00:15 | Fin del margen: una foto sacada antes de las 00:00 se puede terminar de subir hasta acá, y cuenta para el día en que se sacó |
| Todos los días 8:00 | Se cierra **el día anterior**: lo que nadie revisó (comidas y notas) se aprueba solo y quien no tiene comida aprobada le da 1 punto al otro |
| Domingo 21:00 | Resumen semanal (puntos + comidas) |
| Miércoles 04:00 | Se borran las fotos de las semanas ya resumidas. **La data queda**, solo se van las imágenes |

Los horarios están en [supabase/cron.sql](supabase/cron.sql) y la hora del cierre en la migración (`private.grace_hour()`).
Las notificaciones le llegan a cada uno en su idioma.

## Correrlo local

```bash
npm install
```

```bash
npm run dev
```

Necesita el `.env` (ver [.env.example](.env.example)). Si faltan las variables de Supabase, la app muestra "Falta configurar Supabase" en vez de arrancar.

## Puesta en marcha real

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá y ejecutá [supabase/migrations/20261106000000_brote.sql](supabase/migrations/20261106000000_brote.sql).
3. **Authentication → Sign In / Providers → Email**: dejá activo *Email* y desactivá *Allow new users to sign up* (la app es cerrada: solo entran las cuentas que crees vos).
4. **Authentication → Users → Add user → Create new user**: creá las 2 cuentas con email y contraseña, y marcá *Auto Confirm User*.

La sesión no caduca: cada uno entra una vez y queda adentro hasta tocar "Cerrar sesión" (no actives *Time-box user sessions* ni *Inactivity timeout* en Authentication → Sessions). Para cambiar una contraseña: Authentication → Users → la cuenta → *Reset password* o *Update user*.

La primera vez que cada uno entra elige su nombre y su idioma; el avatar y el nombre se cambian después en Config.

### 2. Claves para notificaciones

```bash
npm run vapid
```

Te da una *Public Key* y una *Private Key*. Inventá también un `CRON_SECRET` largo (por ejemplo con `openssl rand -hex 32`).

### 3. Edge function `push`

En **Edge Functions → Secrets** cargá:

- `CRON_SECRET` = el que inventaste
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` = las del paso 2
- `VAPID_SUBJECT` = la URL de la app (ej. `https://brote.vercel.app`)

Deploy (con la CLI, `npx supabase login` la primera vez):

```bash
npx supabase functions deploy push --no-verify-jwt --project-ref TU-PROJECT-REF
```

O desde el dashboard: *Edge Functions → Deploy a new function → Via editor*, nombre `push`, pegá [supabase/functions/push/index.ts](supabase/functions/push/index.ts) y desactivá *Verify JWT*.

### 4. Horarios

Editá las dos primeras variables de [supabase/cron.sql](supabase/cron.sql) (URL del proyecto y `CRON_SECRET`) y ejecutalo en el SQL Editor.

### 5. Frontend en Vercel

Importá el repo en Vercel (detecta Vite solo) y cargá las variables de [.env.example](.env.example):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY`), `VITE_VAPID_PUBLIC_KEY`.

### 6. En los celulares

- **iPhone** (iOS 16.4+): abrir en Safari → Compartir → *Agregar a pantalla de inicio* → abrir desde el ícono → entrar con email y contraseña → **Config → Activar notificaciones**. En iPhone las notificaciones solo funcionan con la app instalada así.
- **Android**: abrir en Chrome → *Instalar app* → entrar → **Config → Activar notificaciones**.

## Probar las tareas programadas a mano

```bash
curl -X POST https://TU-PROYECTO.supabase.co/functions/v1/push \
  -H "x-cron-secret: TU_CRON_SECRET" -H "Content-Type: application/json" \
  -d '{"action":"remind","slot":"midday"}'
```

Otras acciones: `close_day` (opcional `"date":"2026-11-05"`), `weekly_summary`, `cleanup_photos`.

## Desarrollo

- `npm run test:sql`: corre la migración en un Postgres embebido y prueba puntos, permisos, tienda, resumen y limpieza de fotos.
- `npm run check:i18n`: avisa si algún texto de la UI no tiene traducción al portugués.
- Textos: [src/i18n.tsx](src/i18n.tsx) (la clave es el texto en español).
- Estilos: [src/styles.css](src/styles.css); los colores están como variables arriba de todo. Las piezas del mundo Feira (toldo, cartel, números que ruedan) están en [src/components/feira.tsx](src/components/feira.tsx).
- Avatar: [src/avatar/model.ts](src/avatar/model.ts) (formas, colores, ojos, bocas, accesorios, gestos), [src/avatar/Avatar.tsx](src/avatar/Avatar.tsx) (dibujo y animación) y [src/avatar/Hands.tsx](src/avatar/Hands.tsx) (manos).
- Íconos: [react-icons](https://react-icons.github.io/react-icons/), familia Phosphor (`react-icons/pi`). Animaciones: [Motion](https://motion.dev).
