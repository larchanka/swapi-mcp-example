```review-ignore
dist/**
node_modules/**
**/*.min.js
package-lock.json
coverage/**
.git/**
```

# Code Review Rules

## Security and Trust Boundaries

- pattern: `src/**/*.ts`
- exclude: `dist/**`

1. All external inputs (MCP tool parameters, API client method arguments) must undergo strict validation against schemas (e.g. Zod) before executing business logic
2. Direct network requests to arbitrary client-provided URLs are strictly forbidden (SSRF prevention): any incoming URL must have its origin validated against the configured SWAPI base URL, and resource IDs must be extracted and validated before constructing the outbound request
3. Secrets, tokens, authorization headers, and sensitive user data must never be logged, included in error messages, or echoed in tool responses
4. Network requests must only use supported protocols (HTTPS/HTTP) and validated API routes

## Architecture and Contract Compatibility

- pattern: `src/**/*.ts`
- exclude: `dist/**`

1. Changes must preserve backward compatibility for existing tools, client methods, and data models; any breaking change to signatures or response envelopes requires explicit justification
2. Strict separation of concerns must be maintained: the API client manages transport and HTTP communication, tools handle input validation and output formatting, and type declarations model SWAPI resources
3. Domain models and data structures must be strictly typed in TypeScript without relying on `any` or unchecked type assertions
4. Exported functions, classes, and interfaces must document their intent and contract constraints using JSDoc

## Reliability and Error Handling

- pattern: `src/**/*.ts`
- exclude: `dist/**`

1. Transport and network-level failures must be translated into structured domain errors with explicit HTTP status codes and actionable messages, without exposing internal stack traces or environment details
2. Input validation failures must return predictable error codes (such as `InvalidParams` / HTTP 400) clearly identifying the invalid parameter and expected format
3. All outbound HTTP requests must enforce bounded timeouts using `AbortSignal.timeout` to prevent hung connections
4. Batch traversal operations across linked hypermedia entities must tolerate individual link failures when partial results are acceptable, avoiding total call failure

## Code Quality and Surgical Changes

- pattern: `src/**/*.ts`
- exclude: `dist/**`

1. Code must represent the minimum solution that satisfies the requirements; speculative abstractions, unused flexibility, and premature optimizations are prohibited
2. Changes must not introduce dead code, commented-out blocks, or orphaned imports/variables
3. All code must pass strict TypeScript compilation (`strict: true`) with zero compiler warnings or errors
4. Writing to `stdout` is strictly prohibited in stdio-based MCP servers to protect JSON-RPC protocol framing; all diagnostic logs must go exclusively to `stderr`

## Testing and Verification Quality

- pattern: `test/**/*.ts`
- exclude: `dist/**`

1. Every new feature, client method, tool, and error branch must be accompanied by automated, deterministic unit tests
2. Tests must be completely isolated from live networks and must not execute real HTTP calls; external services and transports must be stubbed or mocked
3. Tests must cover both happy paths and negative branches: invalid inputs, 404 Not Found, 500 server errors, timeouts, network transport failures, and SSRF prevention
4. Test assertions must verify exact response payload structures, key attributes, status codes, and error representations
