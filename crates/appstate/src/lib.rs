use config::Config;
use std::sync::Arc;
use tokio::{sync::Mutex, task::JoinHandle};

use std::collections::HashMap;
use tokio::sync::broadcast;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Mutex<Config>>,
    /// Join handles for long-lived tasks (not meant to exit until app shutdown)
    pub join_handles: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    /// Join handles for temporary tasks (may exit independently), mapped by unique id
    pub temp_join_handles: Arc<Mutex<HashMap<usize, tokio::task::JoinHandle<()>>>>,
    /// Next id for temporary tasks
    pub next_temp_id: Arc<Mutex<usize>>,
    /// Global broadcast channel for messaging (binary)
    pub global_sender: broadcast::Sender<Vec<u8>>,
}

impl AppState {
    /// Create a new AppState with empty join handle lists and a global broadcast channel.
    pub fn new(config: Config) -> Self {
        let (global_sender, _) = broadcast::channel(1024);
        AppState {
            config: Arc::new(Mutex::new(config)),
            join_handles: Arc::new(Mutex::new(Vec::new())),
            temp_join_handles: Arc::new(Mutex::new(HashMap::new())),
            next_temp_id: Arc::new(Mutex::new(0)),
            global_sender,
        }
    }

    /// Add a list of join handles to the app state's join_handles list.
    pub async fn add_join_handles(&self, handles: Vec<tokio::task::JoinHandle<()>>) {
        let mut guard = self.join_handles.lock().await;
        guard.extend(handles);
    }

    /// Send a message to the global broadcast channel.
    pub fn send_global_message(
        &self,
        msg: Vec<u8>,
    ) -> Result<usize, broadcast::error::SendError<Vec<u8>>> {
        self.global_sender.send(msg)
    }

    /// Subscribe to the global broadcast channel.
    pub fn subscribe_global_messages(&self) -> broadcast::Receiver<Vec<u8>> {
        self.global_sender.subscribe()
    }

    /// Add a list of join handles to the app state's temp_join_handles list.
    /// Add a list of join handles to the app state's temp_join_handles HashMap, assigning unique ids.
    pub async fn add_temp_join_handles(&self, handles: Vec<tokio::task::JoinHandle<()>>) {
        let mut guard = self.temp_join_handles.lock().await;
        let mut id_guard = self.next_temp_id.lock().await;
        for handle in handles {
            guard.insert(*id_guard, handle);
            *id_guard += 1;
        }
    }
}

/// Macro to await any join handle in AppState, aborting others and logging on exit.
/// Usage: await_any_task!(appstate);
#[macro_export]
macro_rules! await_any_task {
    ($appstate:expr) => {
        async {
            use tokio::sync::mpsc;
            use tracing::error;
            let handles = $appstate.join_handles.clone();
            let mut guard = handles.lock().await;
            if guard.is_empty() {
                error!("No join handles to await in AppState!");
                return;
            }
            // Move out the join handles so we can await them and abort the rest
            let join_handles = std::mem::take(&mut *guard);
            use std::sync::Arc;
            let handles_arc = Arc::new(tokio::sync::Mutex::new(
                join_handles.into_iter().map(Some).collect::<Vec<_>>(),
            ));

            // Channel to notify when any task finishes
            let (tx, mut rx) = mpsc::channel::<(usize, Result<(), tokio::task::JoinError>)>(
                handles_arc.lock().await.len(),
            );

            for idx in 0..handles_arc.lock().await.len() {
                let tx = tx.clone();
                let handles_arc = handles_arc.clone();
                tokio::spawn(async move {
                    let mut handles = handles_arc.lock().await;
                    if let Some(handle) = handles[idx].take() {
                        let res = handle.await;
                        let _ = tx.send((idx, res)).await;
                    }
                });
            }
            drop(tx); // Close sender so rx will end after all tasks

            // Wait for the first task to finish
            if let Some((idx, res)) = rx.recv().await {
                match res {
                    Ok(_) => error!("Task {} exited normally", idx),
                    Err(e) => error!("Task {} exited with error: {:?}", idx, e),
                }
                // Abort the rest
                let mut handles = handles_arc.lock().await;
                for (i, handle_opt) in handles.iter_mut().enumerate() {
                    if i != idx {
                        if let Some(handle) = handle_opt.take() {
                            handle.abort();
                            error!("Aborted task {}", i);
                        }
                    }
                }
            }
        }
    };
}

/// Macro to spawn tasks and track their JoinHandles in AppState.
/// Usage:
///   spawn_tasks!(appstate, f1, f2, ...);
///   spawn_tasks!(appstate, vec_of_fns);
#[macro_export]
macro_rules! spawn_tasks {
    // Accepts: appstate, fn1, fn2, ...
    // NOTE: $task_fn must be an async function or closure returning a Future!
    ($appstate:expr, $($task_fn:expr),+ $(,)?) => {{
        let mut handles = Vec::new();
        $(
            let state = $appstate.clone();
            let handle = tokio::spawn($task_fn(state.clone()));
            handles.push(handle);
        )+
        //count handles
        let ct = handles.len(); //avoids borrow error
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_join_handles(handles).await;
        });
        // Return the number of handles spawned
        ct
    }};
    // Accepts: appstate, vec_of_fns
    // NOTE: Each item in $vec_of_fns must be an async function or closure returning a Future!
    ($appstate:expr, $vec_of_fns:expr) => {{
        let mut handles = Vec::new();
        for task_fn in $vec_of_fns {
            let state = $appstate.clone();
            let handle = tokio::spawn(task_fn(state.clone()));
            handles.push(handle);
        }
        //count handles
        let ct = handles.len(); //avoids borrow error
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_join_handles(handles).await;
        });
        // Return the number of handles spawned
        ct
    }};
}

/// Macro to spawn temporary tasks and track their JoinHandles in AppState's temp_join_handles.
/// Usage:
///   spawn_temporary_tasks!(appstate, f1, f2, ...);
///   spawn_temporary_tasks!(appstate, vec_of_fns);
#[macro_export]
macro_rules! spawn_temporary_tasks {
   // Accepts: appstate, fn1, fn2, ...
   // NOTE: $task_fn must be an async function or closure returning a Future!
   ($appstate:expr, $($task_fn:expr),+ $(,)?) => {{
       let mut handles = Vec::new();
       $(
           let state = $appstate.clone();
           let handle = tokio::spawn($task_fn(state.clone()));
           handles.push(handle);
       )+
       //count handles
       let ct = handles.len(); //avoids borrow error
       let state = $appstate.clone();
       tokio::spawn(async move {
           state.add_temp_join_handles(handles).await;
       });
       // Return the number of handles spawned
       ct
   }};
   // Accepts: appstate, vec_of_fns
   // NOTE: Each item in $vec_of_fns must be an async function or closure returning a Future!
   ($appstate:expr, $vec_of_fns:expr) => {{
       let mut handles = Vec::new();
        for task_fn in $vec_of_fns {
            let state = $appstate.clone();
            let handle = tokio::spawn(task_fn(state.clone()));
            handles.push(handle);
        }
        //count handles
        let ct = handles.len(); //avoids borrow error
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_temp_join_handles(handles).await;
        });
       // Return the number of handles spawned
       ct
    }};
}
