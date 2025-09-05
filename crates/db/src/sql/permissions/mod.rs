/// SQL constants for permissions-related queries and schema.
/// These are embedded at compile time using `include_str!` for easy editing and single binary output.

pub const PERMISSIONS_SCHEMA: &str = include_str!("permissions_schema.sql");
pub const PERMISSIONS_INSERT: &str = include_str!("permissions_insert.sql");
pub const PERMISSIONS_REMOVE: &str = include_str!("permissions_remove.sql");
pub const PERMISSIONS_CHECK: &str = include_str!("permissions_check.sql");
pub const PERMISSIONS_LIST: &str = include_str!("permissions_list.sql");
