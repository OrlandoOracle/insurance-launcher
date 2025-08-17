# Deploy Test

This file confirms the dev branch is deployed successfully.

## Branch: dev
## Date: 2025-08-17
## Storage Mode: browser (for Netlify)

### Features Added:
- Browser storage adapter using IndexedDB
- Export/Import functionality  
- Netlify deployment configuration
- Branch deploys enabled

To test:
1. Visit /api/health - should show `"mode": "browser"`
2. Visit /settings - Export/Import buttons should be visible
3. No 500 errors on any page