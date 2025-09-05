use global_constants::DEFAULT_CONFIG_VERSION;

use serde_json;

use std::any::Any;
use std::fs;
use std::io::Write;
use tracing::*;

///config upgrader macro: allows for easy construction of a macro upgrader implimentation using a macro

///@params

///name: Identifyier: Example: V1toV2

/// old: Type, should be a struct version of every Config version you support

/// new: Type, should be a struct version of the new config your upgrader outputs

/// min: usize, should represent the minimum version your updater works with

/// max: usize, should represent the maximum version your updater works with

/// target: usize, used to tell us what version config this converts to

/// upgrade_fn: closure that takes one parameter: the old config type and returns the new config type, this is the code that does the upgrade

#[macro_export]

macro_rules! config_upgrader {
    (

        $name:ident,

        $old:ty,

        $new:ty,

        $min:expr, $max:expr, $target:expr,

        $upgrade_fn:expr

    ) => {
        pub struct $name;

        impl $crate::ConfigUpdater for $name {
            type OldConfig = $old;

            type NewConfig = $new;

            fn min_version(&self) -> u32 {
                $min
            }

            fn max_version(&self) -> u32 {
                $max
            }

            fn target_version(&self) -> u32 {
                $target
            }

            fn upgrade(&self, old: $old) -> $new {
                ($upgrade_fn)(old)
            }
        }
    };
}

/// Trait for upgrading configuration structs between versions.

/// Each implementation should specify the old config type it can upgrade from,

/// the new config type it upgrades to, the version range it supports, and the version it upgrades to.

pub trait ConfigUpdater {
    /// The type of the old config this updater can handle.

    type OldConfig: for<'de> serde::Deserialize<'de> + Any;

    /// The type of the new config this updater produces.
    type NewConfig: serde::Serialize + Any;

    /// The minimum config version this updater can handle (inclusive).

    fn min_version(&self) -> u32;

    /// The maximum config version this updater can handle (inclusive).

    fn max_version(&self) -> u32;

    /// The version this updater upgrades to.

    fn target_version(&self) -> u32;

    /// Upgrade from the old config to the new config.

    fn upgrade(&self, old: Self::OldConfig) -> Self::NewConfig;
}

/// Trait for chaining upgraders at compile time.
pub trait UpgradeChain<From, To> {
    fn upgrade_chain(&self, from: From) -> To;
}

// Base case: No more upgraders needed
impl<T> UpgradeChain<T, T> for () {
    fn upgrade_chain(&self, from: T) -> T {
        from
    }
}

// Recursive case: Apply the first upgrader, then recurse
impl<U, Tail, From, Mid, To> UpgradeChain<From, To> for (U, Tail)
where
    U: ConfigUpdater<OldConfig = From, NewConfig = Mid>,
    Tail: UpgradeChain<Mid, To>,
{
    fn upgrade_chain(&self, from: From) -> To {
        let mid = self.0.upgrade(from);
        self.1.upgrade_chain(mid)
    }
}

/// Example struct for managing config updaters.
/// You can expand this as needed for your application.
pub struct ConfigMan {}

impl ConfigMan {
    pub fn new() -> Self {
        ConfigMan {}
    }

    /// Loads the config from the given path, handling versioning and upgrades.
    /// If the file does not exist, creates it with the default config.
    /// If the version is current, loads as normal.
    /// If the version is not current, attempts to upgrade (future).
    /// Panics on unrecoverable errors.
    pub fn load_or_init_config<P: AsRef<std::path::Path>>(path: P) -> config::Config {
        use tracing::*;

        let path = path.as_ref();

        // Try to read and parse the config file
        let data = fs::read_to_string(path).ok();

        // If file doesn't exist or can't be read, or version is current, use Config::from_path
        if data.is_none() {
            return config::Config::from_path(path);
        }
        let data = data.unwrap();

        let version: Option<usize> = serde_json::from_str::<serde_json::Value>(&data)
            .ok()
            .and_then(|v| {
                v.get("version")
                    .and_then(|ver| ver.as_u64().map(|n| n as usize))
            });

        if version == Some(DEFAULT_CONFIG_VERSION) {
            return config::Config::from_path(path);
        }

        // If version is not current, here is where you would run upgraders (if any existed)
        // For now, since we only have version 1, treat as error or fallback to default
        warn!(
            "Config version mismatch or missing. Expected version {}, got {:?}. Using default config.",
            DEFAULT_CONFIG_VERSION, version
        );
        let conf = config::Config::default();
        let pretty = serde_json::to_string_pretty(&conf)
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
        conf
    }
}
