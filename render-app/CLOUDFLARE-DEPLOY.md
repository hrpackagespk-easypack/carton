# Cloudflare Pages setup

This adds Cloudflare Pages Functions for server-side calculations while keeping the existing Render files intact.

## Cloudflare Pages settings

- Connect the existing carton GitHub repository.
- Production branch: main
- Root directory: render-app
- Framework preset: None
- Build command: exit 0
- Build output directory: public

The functions folder must stay at the render-app project root, beside public and src. The function at functions/api/calc.js handles the existing same-origin /api/calc request. /health is also available for checking the deployment.

The public/_routes.json file limits Function invocations to /api/* and /health, so ordinary static page and image requests do not invoke the calculation function.

No database or environment variables are needed. The calculator continues saving the user's own saved data in that user's browser.
