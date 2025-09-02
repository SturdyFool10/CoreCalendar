use configman::ConfigMan;
use global_constants::LOGS_PATH;
use tracing::*;

fn main() {
    logging::init_logging();
    info!("Initializing config...");
    let conf = ConfigMan::load_or_init_config("config.json");
    info!("Checking for old logs to clean...");
    logging::cleanup_old_logs(LOGS_PATH, conf.logs.keep_for.clone());
}
