# @alis-build/a2a-history-es

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

ECMAScript package with **generated protobuf (Buf)** definitions and a **JSON-RPC 2.0 HTTP client** for the **A2A History** extension: persisted agent-to-agent conversation **threads** and **thread events**.

## Overview

This package provides:

- **Generated protobuf code** (`alis/a2a/extension/history/v1/`) — [`@bufbuild/protobuf`](https://github.com/bufbuild/protobuf-es) message types and **Connect** service metadata (`history_pb`, `history_connect`) for `ThreadService`
- **JSON-RPC transport** (`transport/jsonrpc/`) — `fetch`-based client that calls a subset of those RPCs over HTTP POST

The JSON-RPC client is intended for browsers or other environments where you already expose the history extension at a single HTTP endpoint; for gRPC/Connect unary calls from Node or compatible clients, use the generated Connect stubs and your preferred transport.

## Installation

```bash
pnpm add @alis-build/a2a-history-es
# or
npm install @alis-build/a2a-history-es
```

### Dependencies

The published package depends on (among others):

- `@bufbuild/protobuf` — protobuf runtime and code generation support
- `@connectrpc/connect` / `@connectrpc/connect-web` — Connect service definitions and web helpers
- `@alis-build/common-es` — shared types (e.g. A2A `Task` / `Message` types referenced by history messages)

You do not need `google-protobuf` or legacy `grpc_pb` generators; codegen follows **protoc-gen-es** / **protoc-gen-connect-es**.

## Import paths

- JSON-RPC client: `@alis-build/a2a-history-es/transport/jsonrpc`
- Protobuf messages and schemas: `@alis-build/a2a-history-es/alis/a2a/extension/history/v1/history_pb`
- Connect service descriptor: `@alis-build/a2a-history-es/alis/a2a/extension/history/v1/history_connect`

## Quick start

```typescript
import {
  A2AHistoryClient,
  JsonRpcProtocolError,
  JsonRpcTransportError,
} from "@alis-build/a2a-history-es/transport/jsonrpc";

const client = new A2AHistoryClient({
  baseUrl: "https://api.example.com",
  getToken: async () => (await getAuthToken()).accessToken,
});

// Single thread by resource name (format: threads/{context_id})
const thread = await client.getThread({ name: "threads/abc123" });

// List threads (optional agentId filter and pagination)
const { threads, nextPageToken } = await client.listThreads({
  pageSize: 20,
  pageToken: "",
  agentId: "my-agent-v1",
});

// List events under a thread
const { events, nextPageToken: eventsNext } = await client.listThreadEvents({
  parent: "threads/abc123",
  pageSize: 50,
});
```

## JSON-RPC client

### Configuration

| Option     | Type                              | Required | Description                                                                                          |
| ---------- | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `baseUrl`  | `string`                          | Yes      | Base URL of the A2A history service (e.g. `https://api.example.com`). No trailing slash.             |
| `getToken` | `() => string \| Promise<string>` | No       | Bearer token provider for direct service access (not via an auth gateway). May be async for refresh. |

### API methods

JSON-RPC `method` strings match the **Connect RPC names** (PascalCase), e.g. `GetThread`.

| Client method      | JSON-RPC method    | Description                                                |
| ------------------ | ------------------ | ---------------------------------------------------------- |
| `getThread`        | `GetThread`        | Get one `Thread` by resource name                          |
| `listThreads`      | `ListThreads`      | List threads with optional `agentId` filter and pagination |
| `listThreadEvents` | `ListThreadEvents` | List `ThreadEvent` resources under a thread                |

Other `ThreadService` RPCs (append event, delete thread, IAM, streaming, etc.) are **not** implemented in this client; use Connect or your server’s native API for those.

### Request and result shapes

Method parameters and results use the same field names as the generated TypeScript types in `history_pb` (protobuf JSON / ES conventions, e.g. `pageSize`, `nextPageToken`, `agentId`). The wire payload is plain JSON inside the JSON-RPC `params` and `result` objects.

### Error handling

- **`JsonRpcTransportError`** — Network failure, non-2xx HTTP response, or response body that is not valid JSON. Optional `status` holds the HTTP status when available.
- **`JsonRpcProtocolError`** — Server returned a JSON-RPC `error` object (e.g. method not found, invalid params). Use `code`, `message`, and optional `data`.

```typescript
try {
  const thread = await client.getThread({ name: "threads/123" });
} catch (err) {
  if (err instanceof JsonRpcTransportError) {
    console.error("HTTP/network:", err.message, err.status);
  } else if (err instanceof JsonRpcProtocolError) {
    console.error("RPC error:", err.code, err.message, err.data);
  }
}
```

### Endpoint

All requests are `POST` to:

```
{baseUrl}/extensions/a2ahistory
```

with `Content-Type: application/json` and an optional `Authorization: Bearer <token>` header when `getToken` is set.

## Protobuf and Connect stubs

Generated files under `alis/a2a/extension/history/v1/`:

- **`history_pb.js` / `history_pb.d.ts`** — Messages such as `Thread`, `ThreadEvent`, `GetThreadRequest`, `ListThreadsRequest`, `ListThreadEventsRequest`, and related schemas for `create()` / serialization.
- **`history_connect.js` / `history_connect.d.ts`** — `ThreadService` method descriptors for use with `@connectrpc/connect` or `@connectrpc/connect-web`.

Resource name patterns (from the proto comments) include:

- Thread: `threads/{context_id}`
- Event: `threads/{context_id}/events/{event_id}`

## Project structure

```
a2a-history-es/
├── alis/a2a/extension/history/v1/   # Generated Buf / Connect code
│   ├── history_pb.js / .d.ts        # Messages and schemas
│   └── history_connect.js / .d.ts   # ThreadService (Connect)
├── transport/jsonrpc/
│   ├── client.ts                    # A2AHistoryClient
│   ├── types.ts                     # JsonRpc* types, config
│   └── index.ts                     # Public exports
├── package.json
└── README.md
```

## License

See [LICENSE](./LICENSE).
