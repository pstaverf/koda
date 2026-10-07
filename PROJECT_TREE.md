# Дерево проекта Koda

```
koda/
├── .env.example
├── .gitignore
├── .npmrc
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── PROJECT_TREE.md
├── tsconfig.base.json
├── README.md
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── auth.ts
│           ├── constants.ts
│           ├── errors.ts
│           ├── friends.ts
│           ├── privacy.ts
│           ├── profile.ts
│           ├── sessions.ts
│           └── ws.ts
└── apps/
    ├── server/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   ├── drizzle.config.ts
    │   ├── drizzle/
    │   │   ├── 0000_initial.sql
    │   │   └── meta/
    │   │       ├── 0000_snapshot.json
    │   │       └── _journal.json
    │   ├── test/
    │   │   ├── helpers/
    │   │   │   ├── app.ts
    │   │   │   ├── redis.ts
    │   │   │   └── db.ts
    │   │   ├── registration.test.ts
    │   │   ├── registration-codes.test.ts
    │   │   ├── registration-token.test.ts
    │   │   ├── sessions.test.ts
    │   │   ├── login.test.ts
    │   │   ├── csrf.test.ts
    │   │   ├── privacy-last-seen.test.ts
    │   │   ├── friends.test.ts
    │   │   └── blocks.test.ts
    │   └── src/
    │       ├── index.ts
    │       ├── app.ts
    │       ├── env.ts
    │       ├── db/
    │       │   ├── client.ts
    │       │   └── schema.ts
    │       ├── redis/
    │       │   └── client.ts
    │       ├── lib/
    │       │   ├── errors.ts
    │       │   ├── hash.ts
    │       │   ├── ids.ts
    │       │   ├── password.ts
    │       │   ├── tokens.ts
    │       │   ├── cookies.ts
    │       │   ├── guards.ts
    │       │   ├── rateLimit.ts
    │       │   ├── turnstile.ts
    │       │   └── time.ts
    │       ├── mail/
    │       │   ├── mailer.ts
    │       │   └── templates.ts
    │       ├── media/
    │       │   ├── storage.ts
    │       │   └── images.ts
    │       ├── auth/
    │       │   ├── routes.ts
    │       │   ├── register.ts
    │       │   ├── codes.ts
    │       │   ├── login.ts
    │       │   ├── session.ts
    │       │   └── reset.ts
    │       ├── media/routes.ts
    │       ├── profile/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── friends/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── blocks/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── privacy/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── sessions/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── account/
    │       │   ├── routes.ts
    │       │   └── service.ts
    │       ├── ws/
    │       │   ├── routes.ts
    │       │   ├── connection.ts
    │       │   ├── auth.ts
    │       │   ├── hub.ts
    │       │   ├── presence.ts
    │       │   └── friends.ts
    │       └── jobs/
    │           └── cleanup.ts
    └── client/
        ├── index.html
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── vitest.config.ts
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── router.tsx
            ├── strings.ts
            ├── vite-env.d.ts
            ├── styles/
            │   ├── tokens.css
            │   ├── base.css
            │   ├── glass.css
            │   └── animations.css
            ├── api/
            │   ├── http.ts
            │   ├── auth.ts
            │   ├── profile.ts
            │   ├── media.ts
            │   ├── friends.ts
            │   ├── blocks.ts
            │   ├── privacy.ts
            │   ├── sessions.ts
            │   └── account.ts
            ├── ws/
            │   ├── connection.ts
            │   ├── handlers.ts
            │   └── store.ts
            ├── store/
            │   ├── session.ts
            │   ├── profile.ts
            │   ├── friends.ts
            │   ├── presence.ts
            │   ├── toasts.ts
            │   └── appearance.ts
            ├── lib/
            │   ├── queryClient.ts
            │   ├── timezone.ts
            │   ├── urls.ts
            │   └── files.ts
            ├── components/
            │   ├── AppShell.tsx
            │   ├── Avatar.tsx
            │   ├── BackgroundGlow.tsx
            │   ├── Banner.tsx
            │   ├── BottomNav.tsx
            │   ├── CodeInput.tsx
            │   ├── EmojiButton.tsx
            │   ├── EmojiPicker.tsx
            │   ├── Field.tsx
            │   ├── GlassButton.tsx
            │   ├── GlassDefs.tsx
            │   ├── GlassInput.tsx
            │   ├── GlassPanel.tsx
            │   ├── GlassTextarea.tsx
            │   ├── GlassToggle.tsx
            │   ├── ImageCropper.tsx
            │   ├── KodaLogo.tsx
            │   ├── Modal.tsx
            │   ├── PasswordField.tsx
            │   ├── PasswordStrength.tsx
            │   ├── Sidebar.tsx
            │   ├── Spinner.tsx
            │   ├── Steps.tsx
            │   ├── Toasts.tsx
            │   └── Turnstile.tsx
            ├── screens/
            │   ├── Login.tsx
            │   ├── ResetPassword.tsx
            │   ├── Profile.tsx
            │   ├── UserProfile.tsx
            │   ├── Friends.tsx
            │   ├── register/
            │   │   ├── RegisterLayout.tsx
            │   │   ├── EmailStep.tsx
            │   │   ├── CodeStep.tsx
            │   │   ├── PasswordStep.tsx
            │   │   ├── PhotoStep.tsx
            │   │   └── NameStep.tsx
            │   └── settings/
            │       ├── SettingsLayout.tsx
            │       ├── ProfileSection.tsx
            │       ├── PrivacySection.tsx
            │       ├── SecuritySection.tsx
            │       ├── SessionsSection.tsx
            │       ├── AppearanceSection.tsx
            │       └── AboutSection.tsx
            └── test/
                ├── setup.ts
                ├── strings.test.ts
                ├── api.http.test.ts
                ├── ws.connection.test.ts
                ├── passwordStrength.test.ts
                ├── friends.store.test.ts
                ├── presence.store.test.ts
                ├── privacy.form.test.ts
                └── register.code.test.tsx
```

Этап 1 материализует корневые файлы, `pnpm-workspace.yaml`, `package.json` и `tsconfig.json` всех трёх пакетов, `docker-compose.yml` и `.env.example`. Остальные файлы дерева выдаются на последующих этапах согласно ТЗ.
