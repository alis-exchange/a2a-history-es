/**
 * A2A History JSON-RPC client.
 *
 * Sends HTTP POST requests to an A2A history service endpoint using the JSON-RPC 2.0
 * protocol. Supports optional bearer token authentication for direct service access.
 *
 * Flow: config → buildHeaders → request (serialize → fetch → parse) → return result
 * Errors: JsonRpcTransportError (network/HTTP) or JsonRpcProtocolError (server error object).
 */
import type {
  GetThreadRequest,
  ListThreadEventsRequest,
  ListThreadEventsResponse,
  ListThreadsRequest,
  ListThreadsResponse,
  Thread,
} from "../../alis/a2a/extension/history/v1/history_pb";
import type {
  A2AHistoryClientConfig,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types";

/** JSON-RPC method identifiers. Must match server-side method names. */
const Methods = {
  getThread: "GetThread",
  listThreads: "ListThreads",
  listThreadEvents: "ListThreadEvents",
} as const;

/** JSON-RPC version string per spec. */
const JSONRPC_VERSION = "2.0";

/** URL path suffix for the A2A history extension; appended to baseUrl. */
const HISTORY_EXTENSION_PATH = "/extensions/a2ahistory";

/**
 * Raised when the server returns a JSON-RPC error object (e.g. method not found,
 * invalid params). Use `code` and `data` for application-level handling.
 */
export class JsonRpcProtocolError extends Error {
  public readonly code: number;
  public readonly data: unknown;

  constructor(error: JsonRpcError) {
    super(error.message);
    this.name = "JsonRpcProtocolError";
    this.code = error.code;
    this.data = error.data;
  }
}

/**
 * Raised on network failure, non-2xx HTTP status, or invalid response JSON.
 * Use `status` when available for HTTP status code (e.g. 401, 500).
 */
export class JsonRpcTransportError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "JsonRpcTransportError";
    this.status = status;
  }
}

/**
 * Client for the A2A history JSON-RPC API.
 * Each public method maps to a single JSON-RPC method and returns typed protobuf-like objects.
 */
export class A2AHistoryClient {
  private readonly config: A2AHistoryClientConfig;

  /** Monotonically increasing request ID; used for JSON-RPC `id` field. */
  private requestId = 0;

  constructor(config: A2AHistoryClientConfig) {
    this.config = config;
  }

  /**
   * Retrieves a single Thread by resource name.
   *
   * @param params - Request containing the resource name (e.g. `name: "threads/123"`)
   * @returns The Thread as a plain object
   * JSON-RPC: `GetThread`
   */
  async getThread(params: GetThreadRequest): Promise<Thread> {
    return this.request<Thread>(Methods.getThread, params);
  }

  /**
   * Lists Thread resources, with optional `agentId` filter and pagination.
   *
   * @param params - Optional `agentId`, `pageSize`, `pageToken`, `readMask`
   * @returns Paginated list and next token
   * JSON-RPC: `ListThreads`
   */
  async listThreads(
    params: Partial<ListThreadsRequest> = {},
  ): Promise<ListThreadsResponse> {
    return this.request<ListThreadsResponse>(Methods.listThreads, params);
  }

  /**
   * Lists events within a given Thread, with optional pagination.
   *
   * @param params - Must include `parent` (thread resource name); optional pageSize, pageToken
   * @returns Paginated events and next token
   * JSON-RPC: `ListThreadEvents`
   */
  async listThreadEvents(
    params: Partial<ListThreadEventsRequest> &
      Pick<ListThreadEventsRequest, "parent">,
  ): Promise<ListThreadEventsResponse> {
    return this.request<ListThreadEventsResponse>(
      Methods.listThreadEvents,
      params,
    );
  }

  /**
   * Core request pipeline: build payload → POST → parse response → extract result or throw.
   *
   * Flow:
   * 1. Build JSON-RPC request envelope (jsonrpc, method, params, id)
   * 2. Build headers (Content-Type; optional Authorization via getToken)
   * 3. POST to baseUrl + HISTORY_EXTENSION_PATH
   * 4. On network/fetch failure → JsonRpcTransportError
   * 5. On non-2xx → JsonRpcTransportError with status
   * 6. Parse JSON; on parse failure → JsonRpcTransportError
   * 7. If response.error present → JsonRpcProtocolError
   * 8. Return response.result
   *
   * @param method - JSON-RPC method name (e.g. `"GetThread"`)
   * @param params - Optional params object; serialized as JSON
   * @returns Parsed result cast to R
   * @throws {JsonRpcTransportError} On network failure or non-2xx HTTP status
   * @throws {JsonRpcProtocolError} When the server returns a JSON-RPC error object
   */
  private async request<R>(method: string, params?: unknown): Promise<R> {
    const payload: JsonRpcRequest = {
      jsonrpc: JSONRPC_VERSION,
      method,
      params,
      id: ++this.requestId,
    };

    const headers = await this.buildHeaders();

    let response: Response;
    try {
      response = await fetch(
        `${this.config.baseUrl}${HISTORY_EXTENSION_PATH}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
      );
    } catch (cause) {
      throw new JsonRpcTransportError(
        `Network error calling ${method}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }

    if (!response.ok) {
      throw new JsonRpcTransportError(
        `HTTP ${response.status} ${response.statusText} calling ${method}`,
        response.status,
      );
    }

    let data: JsonRpcResponse<R>;
    try {
      data = await response.json();
    } catch {
      // Malformed or non-JSON response body
      throw new JsonRpcTransportError(
        `Invalid JSON in response from ${method}`,
      );
    }

    if (data.error) {
      throw new JsonRpcProtocolError(data.error);
    }

    /* Per JSON-RPC spec: exactly one of result or error; result present here */
    return data.result as R;
  }

  /**
   * Builds HTTP headers for the JSON-RPC request.
   * Always sets Content-Type: application/json; adds Authorization Bearer if getToken is configured.
   */
  private async buildHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.getToken) {
      const token = await this.config.getToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }
}