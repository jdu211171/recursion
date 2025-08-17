# TODO

- [x] Review repo, git status, recent commits
- [x] Integrate `LoginForm` into SPA
- [x] Add logout navigation from user menu
- [x] Conditional render login vs. app content
- [x] Fix layout shift in login form when back button appears
- [x] Add more padding to social login buttons (using size="lg")
- [ ] Validate flows in dev and polish copy

## Notes

- No router added; simple auth gate in `App.tsx` using `localStorage`.
- `HeaderNavUser` now accepts optional `onLogout` and triggers it from the menu.
- `LoginForm` accepts optional `onAuthenticated` and calls it after basic validation.

## Follow-ups

- Replace mock auth with real API when available.
- Redirect to originally requested route (if routing is added later).
