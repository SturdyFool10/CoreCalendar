use appstate::AppState;
use tracing::*;

///entry point for the web server, gets a copy of state for its own use, state is Arc on everything so its a global state
use axum::{
    Router,
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::{Html, IntoResponse},
    routing::get,
    serve,
};
use std::net::SocketAddr;
use tokio::net::TcpListener;

const INDEX_HTML: &str = include_str!("./html_src/index.html");
const MAIN_JS: &str = include_str!("./html_src/main.js");
const STYLE_CSS: &str = include_str!("./html_src/style.css");

pub async fn start_web_server(state: AppState) {
    let app = Router::new()
        .route("/", get(index_html))
        .route("/main.js", get(main_js))
        .route("/style.css", get(style_css))
        .route("/ws", get(ws_handler))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));

    log_listen_address(addr);

    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind address");
    serve(listener, app.into_make_service())
        .await
        .expect("Failed to start Axum server");
}

async fn index_html() -> impl IntoResponse {
    Html(INDEX_HTML)
}

async fn main_js() -> impl IntoResponse {
    ([("Content-Type", "application/javascript")], MAIN_JS)
}

async fn style_css() -> impl IntoResponse {
    ([("Content-Type", "text/css")], STYLE_CSS)
}

async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| websocket_handler(socket, state))
}

use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

async fn websocket_handler(socket: WebSocket, state: AppState) {
    // Create a channel for sending messages to this socket from other tasks
    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    // Register a new connection and get its UUID
    let conn_id = state.register_connection(tx.clone()).await;
    info!("WebSocket connection registered: {conn_id}");

    // Split the socket into sender and receiver
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Spawn a task to forward messages from the channel to the socket
    let sender_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Main message loop
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(txt) => {
                // Echo text messages for now
                let _ = tx.send(Message::Text(txt));
            }
            Message::Binary(data) => {
                // Stub: handle binary messages here
                // For now, just echo the binary data back
                let _ = tx.send(Message::Binary(data));
            }
            Message::Ping(payload) => {
                // Respond to ping with pong
                let _ = tx.send(Message::Pong(payload));
            }
            Message::Pong(_) => {
                // Optionally handle pong (usually no-op)
            }
            Message::Close(frame) => {
                // Optionally handle close frame
                let _ = tx.send(Message::Close(frame));
                break;
            }
        }
    }

    // Cleanup: remove connection from AppState
    state.remove_connection(&conn_id).await;
    info!("WebSocket connection cleaned up: {conn_id}");

    // Ensure sender task is finished
    let _ = sender_task.await;
}

/// Print fancy listen address messaging for the user.
fn log_listen_address(addr: SocketAddr) {
    match addr {
        SocketAddr::V4(v4) => {
            let ip = v4.ip();
            let port = v4.port();
            if ip.octets() == [0, 0, 0, 0] {
                info!(
                    "Web server listening on ALL IPv4 interfaces (0.0.0.0:{}) — accessible from any network interface on this machine.",
                    port
                );
                info!("Full listen address: http://*:{port}");
            } else if ip.octets()[0] == 127 {
                info!(
                    "Web server listening on localhost ({}:{}) — only accessible from this machine.",
                    ip, port
                );
                info!("Full listen address: http://localhost:{port}");
            } else if ip.is_broadcast() {
                info!(
                    "Web server listening on broadcast address ({}:{}) — this is unusual and may be for special network discovery.",
                    ip, port
                );
                info!("Full listen address: http://{}:{}", ip, port);
            } else if ip.is_private() {
                info!(
                    "Web server listening on private network ({}:{}) — accessible from your LAN.",
                    ip, port
                );
                info!("Full listen address: http://{}:{}", ip, port);
            } else {
                info!(
                    "Web server listening on specific IPv4 address ({}:{}) — check your network configuration.",
                    ip, port
                );
                info!("Full listen address: http://{}:{}", ip, port);
            }
        }
        SocketAddr::V6(v6) => {
            let ip = v6.ip();
            let port = v6.port();
            if ip.is_unspecified() {
                info!(
                    "Web server listening on ALL IPv6 interfaces ([::]:{}) — accessible from any IPv6 network interface.",
                    port
                );
                info!("Full listen address: http://*:{port}");
            } else if ip.is_loopback() {
                info!(
                    "Web server listening on IPv6 loopback ([::1]:{}) — only accessible from this machine.",
                    port
                );
                info!("Full listen address: http://localhost:{port}");
            } else if ip.is_multicast() {
                info!(
                    "Web server listening on IPv6 multicast address ([{}]:{}) — this is unusual and may be for special network discovery.",
                    ip, port
                );
                info!("Full listen address: http://[{}]:{}", ip, port);
            } else if ip.is_unique_local() {
                info!(
                    "Web server listening on unique local IPv6 address ([{}]:{}) — accessible from your local network.",
                    ip, port
                );
                info!("Full listen address: http://[{}]:{}", ip, port);
            } else {
                info!(
                    "Web server listening on specific IPv6 address ([{}]:{}) — check your network configuration.",
                    ip, port
                );
                info!("Full listen address: http://[{}]:{}", ip, port);
            }
        }
    }
}
