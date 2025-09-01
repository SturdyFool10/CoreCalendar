use serde::{Deserialize, Serialize};

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
