use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::Path};
use tracing::*;

const CONFIG_NATIVE_VERSION: usize = 1; //adjust this as needed, sets the current version of the config

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    version: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: CONFIG_NATIVE_VERSION,
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
