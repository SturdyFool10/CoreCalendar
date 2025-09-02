use config::Config;
use std::path::Path;
use tracing::*;

// Use MultiWriter from logging crate

#[tokio::main]
async fn main() {
    logging::init_logging();
    info!("trying to load config...");
    let conf = Config::from_path(Path::new("config.json"));
    info!("Config loaded: {:?}", conf);
}
