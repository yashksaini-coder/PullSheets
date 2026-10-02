## What

<!-- One or two sentences: what changes and why. Link the spec/plan section if there is one. -->

## How to verify

<!-- Commands or clicks a reviewer can run. "pnpm test" alone is not enough for UI changes. -->

## Checklist

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass locally
- [ ] New env vars are in `.env.example` with their tier and how to obtain them
- [ ] Schema changes come with a generated migration under `drizzle/`
- [ ] Nothing under `components/cards/` imports Next or browser APIs
