/**
 * JSON-RPC 2.0 type definitions and client configuration.
 * These types are used by the A2A history JSON-RPC client for request/response
 * serialization and error handling.
 */

/** Standard JSON-RPC 2.0 error object (spec-compliant). */
export interface JsonRpcError {
  /** Integer error code.
   *
   * Standard codes:
   *  - -32700 parse error,
   *  - -32600 invalid request,
   *  - -32601 method not found,
   *  - -32602 invalid params,
   *  - -32603 internal error.
   * */
  code: number;
  message: string;
  /** Optional additional error data. */
  data?: unknown;
}

/** Outbound JSON-RPC 2.0 request envelope. */
export interface JsonRpcRequest<P = unknown> {
  jsonrpc: "2.0";
  method: string;
  /** Optional method parameters; omitted when not needed. */
  params?: P;
  /** Request ID for matching responses; string or number. */
  id: string | number;
}

/**
 * Inbound JSON-RPC 2.0 response envelope.
 * Exactly one of `result` or `error` is set per the spec; the other is absent.
 */
export type JsonRpcResponse<R = unknown> =
  | { jsonrpc: "2.0"; id: string | number; result: R; error?: never }
  | {
      jsonrpc: "2.0";
      id: string | number;
      error: JsonRpcError;
      result?: never;
    };

/**
 * Configuration for the A2A history JSON-RPC client.
 */
export interface A2AHistoryClientConfig {
  /**
   * Base URL of the A2A history service (e.g. https://api.example.com).
   * Should not include a trailing slash; extension path is appended automatically.
   */
  baseUrl: string;
  /**
   * Optional bearer token provider. Only needed for clients not going through
   * the auth gateway. The function may be async to support token refresh.
   */
  getToken?: () => string | Promise<string>;
}