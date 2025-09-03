use appstate::AppState;

///entry point for the web server, gets a copy of state for its own use, state is Arc on everything so its a global state
pub fn start_web_server(state: AppState) {}
