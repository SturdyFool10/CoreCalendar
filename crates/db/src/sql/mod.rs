/// SQL module for authentication-related queries and schema.
///
/// Provides constants for each SQL file used for authentication.
/// These constants can be used with rusqlite's `include_str!` macro
/// for embedding SQL at compile time.

pub const AUTH_SCHEMA: &str = include_str!("authentication_schema.sql");
pub const AUTH_INSERT: &str = include_str!("authentication_insert.sql");
pub const AUTH_UPDATE_PASSWORD: &str = include_str!("authentication_update_password.sql");
pub const AUTH_UPDATE_EMAIL: &str = include_str!("authentication_update_email.sql");
pub const AUTH_SELECT_BY_USERNAME: &str = include_str!("authentication_select_by_username.sql");
pub const AUTH_DELETE_BY_USERNAME: &str = include_str!("authentication_delete_by_username.sql");
pub const AUTH_SELECT_SALT_BY_USERNAME: &str =
    include_str!("authentication_select_salt_by_username.sql");

pub mod permissions;
