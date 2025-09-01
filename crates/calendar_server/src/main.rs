use logging::MultiWriter;
use tokio::time::{Duration, sleep};
use tracing::*;

// Use MultiWriter from logging crate

#[tokio::main]
async fn main() {
    logging::init_logging();

    info!("Welcome to FamilyCalendarRS");
    warn!("This is a warning log for testing");
    error!("This is an error log for testing");
    // Force flush logs for test
    use std::io::Write;
    let _ = std::io::stdout().flush();
    let _ = std::io::stderr().flush();

    // Give the runtime a moment to flush logs
    sleep(Duration::from_millis(100)).await;
}
