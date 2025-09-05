use appstate::{await_any_task, spawn_tasks};
use configman::ConfigMan;
use global_constants::LOGS_PATH;
use logging::test_panic;
use tracing::*;
use webserver::start_web_server;

#[tokio::main]
async fn main() {
    logging::init_logging();
    info!("Initializing config...");
    let conf = ConfigMan::load_or_init_config("config.json");
    info!("Checking for old logs to clean...");
    logging::cleanup_old_logs(LOGS_PATH, conf.logs.keep_for.clone());
    let state = appstate::AppState::new(conf);
    let count = spawn_tasks!(state, start_web_server);
    info!(
        "Spawned {} task{}",
        count,
        if count == 1 { "" } else { "s" }
    );

    await_any_task!(state).await;
}
