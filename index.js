#!/usr/bin/env node
// Entry point shim so the server can be started as `node index.js` from the project root.
// Requires the project to be built first (`npm run build`).
// Damn
import "./dist/index.js";
