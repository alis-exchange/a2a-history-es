/**
 * A2A History JSON-RPC transport.
 *
 * Re-exports `A2AHistoryClient` (Thread / ThreadEvent JSON-RPC API), error
 * classes, and JSON-RPC 2.0 helper types.
 */
export {
  A2AHistoryClient,
  JsonRpcProtocolError,
  JsonRpcTransportError,
} from "./client";
export type {
  A2AHistoryClientConfig,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types";