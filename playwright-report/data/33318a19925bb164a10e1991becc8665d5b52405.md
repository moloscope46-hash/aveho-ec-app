# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke-all-pages.spec.js >> Smoke pages avec auth (redirect /login accepté) >> /promotions se charge (ou redirige vers /login)
- Location: tests\e2e\smoke-all-pages.spec.js:126:9

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\molos\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```