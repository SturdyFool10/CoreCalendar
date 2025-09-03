use config::Config;
use std::sync::Arc;
use tokio::{sync::Mutex, task::JoinHandle};

use std::collections::HashMap;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Mutex<Config>>,
    /// Join handles for long-lived tasks (not meant to exit until app shutdown)
    pub join_handles: Arc<Mutex<Vec<tokio::task::JoinHandle<()>>>>,
    /// Join handles for temporary tasks (may exit independently), mapped by unique id
    pub temp_join_handles: Arc<Mutex<HashMap<usize, tokio::task::JoinHandle<()>>>>,
    /// Next id for temporary tasks
    pub next_temp_id: Arc<Mutex<usize>>,
}

impl AppState {
    /// Create a new AppState with empty join handle lists.
    pub fn new(config: Config) -> Self {
        AppState {
            config: Arc::new(Mutex::new(config)),
            join_handles: Arc::new(Mutex::new(Vec::new())),
            temp_join_handles: Arc::new(Mutex::new(HashMap::new())),
            next_temp_id: Arc::new(Mutex::new(0)),
        }
    }

    /// Add a list of join handles to the app state's join_handles list.
    pub async fn add_join_handles(&self, handles: Vec<tokio::task::JoinHandle<()>>) {
        let mut guard = self.join_handles.lock().await;
        guard.extend(handles);
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
    ($appstate:expr) => {{
        use futures::future::FutureExt;
        use tracing::error;
        let handles = $appstate.join_handles.clone();
        tokio::spawn(async move {
            let mut guard = handles.lock().await;
            if guard.is_empty() {
                error!("No join handles to await in AppState!");
                return;
            }
            // Pin all join handles and collect as futures
            let mut futures: Vec<_> = guard.iter_mut().map(|h| h.fuse()).collect();
            futures::select! {
                // Await any handle
                idx = futures::future::select_all(futures) => {
                    let (res, idx, _) = idx;
                    match res {
                        Ok(_) => error!("Task {} exited normally", idx),
                        Err(e) => error!("Task {} exited with error: {:?}", idx, e),
                    }
                    // Abort the rest
                    for (i, handle) in guard.iter().enumerate() {
                        if i != idx {
                            handle.abort();
                        }
                    }
                }
            }
        });
    }};
}

/// Macro to spawn tasks and track their JoinHandles in AppState.
/// Usage:
///   spawn_tasks!(appstate, f1, f2, ...);
///   spawn_tasks!(appstate, vec_of_fns);
#[macro_export]
macro_rules! spawn_tasks {
    // Accepts: appstate, fn1, fn2, ...
    ($appstate:expr, $($task_fn:expr),+ $(,)?) => {{
        let mut handles = Vec::new();
        $(
            let state = $appstate.clone();
            let handle = tokio::spawn($task_fn(state.clone()));
            handles.push(handle);
        )+
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_join_handles(handles.clone()).await;
        });
        handles.len()
    }};
    // Accepts: appstate, vec_of_fns
    ($appstate:expr, $vec_of_fns:expr) => {{
        let mut handles = Vec::new();
        for task_fn in $vec_of_fns {
            let state = $appstate.clone();
            let handle = tokio::spawn(task_fn(state.clone()));
            handles.push(handle);
        }
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_join_handles(handles.clone()).await;
        });
        handles.len()
    }};
}

/// Macro to spawn temporary tasks and track their JoinHandles in AppState's temp_join_handles.
/// Usage:
///   spawn_temporary_tasks!(appstate, f1, f2, ...);
///   spawn_temporary_tasks!(appstate, vec_of_fns);
#[macro_export]
macro_rules! spawn_temporary_tasks {
   // Accepts: appstate, fn1, fn2, ...
   ($appstate:expr, $($task_fn:expr),+ $(,)?) => {{
       let mut handles = Vec::new();
       $(
           let state = $appstate.clone();
           let handle = tokio::spawn($task_fn(state.clone()));
           handles.push(handle);
       )+
       let state = $appstate.clone();
       tokio::spawn(async move {
           state.add_temp_join_handles(handles.clone()).await;
       });
       handles.len()
   }};
   // Accepts: appstate, vec_of_fns
   ($appstate:expr, $vec_of_fns:expr) => {{
       let mut handles = Vec::new();
        for task_fn in $vec_of_fns {
            let state = $appstate.clone();
            let handle = tokio::spawn(task_fn(state.clone()));
            handles.push(handle);
        }
        let state = $appstate.clone();
        tokio::spawn(async move {
            state.add_temp_join_handles(handles).await;
        });
       handles.len()
    }};
}
