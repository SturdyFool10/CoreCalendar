use appstate::AppState;
use axum::body::Bytes;
use axum::extract::ws::{Message, WebSocket};
use rmp_serde::{from_slice, to_vec};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;

/// Example message structure for binary protocol
#[derive(Debug, Serialize, Deserialize)]
pub struct GenericBinaryMessage {
    pub kind: String,
    pub payload: Vec<u8>,
}

/// Handles a binary websocket message, with access to AppState.
/// - `socket`: The websocket connection to the client (for singular responses)
/// - `state`: Shared AppState (for global messaging)
/// - `raw`: The raw binary message received
pub async fn handle_binary_message(socket: &mut WebSocket, state: AppState, raw: Vec<u8>) {
    // Try to decode the message as MessagePack
    let msg: Result<GenericBinaryMessage, _> = from_slice(&raw);
    match msg {
        Ok(parsed) => {
            // Example: echo back to sender if kind == "echo"
            if parsed.kind == "echo" {
                // Echo only to sender
                if let Ok(reply) = to_vec(&parsed) {
                    let _ = socket.send(Message::Binary(Bytes::from(reply))).await;
                }
            } else if parsed.kind == "broadcast" {
                // Broadcast to all clients via AppState's global channel
                let _ = state.send_global_message(raw.clone());
            } else {
                // Unknown kind, send error to sender only
                let err_msg = GenericBinaryMessage {
                    kind: "error".to_string(),
                    payload: b"Unknown message kind".to_vec(),
                };
                if let Ok(reply) = to_vec(&err_msg) {
                    let _ = socket.send(Message::Binary(Bytes::from(reply))).await;
                }
            }
        }
        Err(_) => {
            // Failed to decode, send error to sender only
            let err_msg = GenericBinaryMessage {
                kind: "error".to_string(),
                payload: b"Invalid MessagePack".to_vec(),
            };
            if let Ok(reply) = to_vec(&err_msg) {
                let _ = socket.send(Message::Binary(Bytes::from(reply))).await;
            }
        }
    }
}

/// Listen for global messages and forward them to this client.
/// Call this in a spawned task per websocket connection.
pub async fn forward_global_messages(
    mut socket: WebSocket,
    mut global_rx: broadcast::Receiver<Vec<u8>>,
) {
    while let Ok(msg) = global_rx.recv().await {
        let _ = socket.send(Message::Binary(Bytes::from(msg))).await;
    }
}
