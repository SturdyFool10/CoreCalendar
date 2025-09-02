/// Global constants for the FamilyCalendarRS project.
/// This crate is intended to centralize configuration defaults, versioning, and other
/// project-wide constants that may be used across multiple subcrates.

/// The default configuration version for the application.
pub const DEFAULT_CONFIG_VERSION: usize = 1;

/// The default JWT expiry time in seconds (e.g., 1 hour).
pub const DEFAULT_JWT_EXPIRY_SECONDS: usize = 3600;

/// The default rate limit for authentication requests (requests per minute).
pub const DEFAULT_AUTH_RATE_LIMIT_PER_MINUTE: u32 = 5;

/// The name of the application, for use in logs, configs, etc.
pub const APP_NAME: &str = "FamilyCalendarRS";

/// The default path for logs.
pub const LOGS_PATH: &str = "./logs";
