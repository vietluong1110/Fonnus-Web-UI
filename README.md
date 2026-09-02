# Fonnus

Landing page, auth flows and signed-in app shell for Fonnus — an AI
receptionist that answers the phone for Vietnamese clinics, in Vietnamese, 24/7.

The app is a static React + Vite site in [`web/`](web/). It has no backend: the
sign-up and sign-in flows run against `src/auth/mockAuth.ts`, and every function
there is marked with a `TODO` naming the endpoint it should become.

```bash
cd web
npm install
npm run dev        # dev server
npm run build      # typecheck + static build into dist/
npm run preview    # serve the build
```

`dist/` is a fully static site and can be dropped on any host.

## Layout

```
web/                 the app — see web/README.md for the full tour
design-reference/    archived design handoff; not built, not imported
CONTEXT.md           product and market context
```

**[`web/README.md`](web/README.md) is the real documentation.** It covers the
routing, the design system, the auth flows, the Lễ tân tab, the orb, and the
reasoning behind the parts that look strange on purpose. Read it before changing
anything in `web/src/`.

`design-reference/` is the original Claude Design prototype for the landing
page, kept only as a visual reference. Nothing imports it and nothing builds it
— you can ignore it unless you are porting a design-system primitive the app
does not have yet.
