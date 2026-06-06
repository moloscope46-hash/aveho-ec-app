# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: materiel-articles-scan.spec.js >> 0.58.75 - HOTFIX SW : pas de TypeError au boot >> Service Worker chargé sans erreur (pas de TypeError: Failed to fetch)
- Location: tests\e2e\materiel-articles-scan.spec.js:365:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\molos\AppData\Local\ms-playwright\firefox-1522\firefox\firefox.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```