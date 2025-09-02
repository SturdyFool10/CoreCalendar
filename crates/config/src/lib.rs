use global_constants::DEFAULT_CONFIG_VERSION;
use humantime_serde;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::{fs, io::Write, path::Path};
use tracing::*;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogConfig {
    #[serde(with = "humantime_serde")]
    pub keep_for: Duration,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            keep_for: Duration::from_secs(60 * 60 * 24 * 7), // 1 week
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub version: usize,
    pub logs: LogConfig,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: DEFAULT_CONFIG_VERSION,
            logs: LogConfig::default(),
        }
    }
}

impl Config {
    pub fn from_path(path: &Path) -> Self {
        if !path.exists() {
            warn!(
                "Config not found at {:?}, using default and creating new config file",
                path
            );
            let def: Config = Config::default();
            // Try to create the parent directory if it doesn't exist
            if let Some(parent) = path.parent() {
                if let Err(e) = fs::create_dir_all(parent) {
                    panic!("Failed to create config directory {:?}: {}", parent, e);
                }
            }
            // Try to write the default config to the file
            let pretty = serde_json::to_string_pretty(&def)
                .expect("Failed to serialize default config to JSON");
            match fs::File::create(path) {
                Ok(mut file) => {
                    if let Err(e) = file.write_all(pretty.as_bytes()) {
                        panic!("Failed to write default config to file {:?}: {}", path, e);
                    }
                }
                Err(e) => {
                    panic!("Failed to create config file {:?}: {}", path, e);
                }
            }
            def
        } else {
            // Try to read and deserialize the config file
            let data = fs::read_to_string(path)
                .unwrap_or_else(|e| panic!("Failed to read config file {:?}: {}", path, e));
            serde_json::from_str(&data)
                .unwrap_or_else(|e| panic!("Failed to parse config file {:?}: {}", path, e))
        }
    }
}
