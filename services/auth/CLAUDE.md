---

## Package Management

Use Bun for package management:

- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun add` instead of `npm install <package>`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>`
- Use `bun <file>` to run TypeScript files directly
- Bun automatically loads .env, so don't use dotenv

## Backend Development

- Use Express for API servers (already installed)
- For database connections, use standard Node.js libraries
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile for file operations

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend Development

Use Vite for frontend development:

- Create frontend apps with `bun create vite` (uses Bun to run the Vite scaffolding)
- Use `bun install` to install dependencies
- Use `bun run dev` to start the Vite dev server
- Use `bun run build` to build for production

Frontend services should be separate from backend services and communicate via APIs.

For more information about Bun's capabilities, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
