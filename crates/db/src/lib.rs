use rusqlite::{Connection, OptionalExtension, params};
use std::error::Error;
use std::path::Path;

pub mod sql;

pub struct DatabaseConnection {
    pub conn: Connection,
}

impl DatabaseConnection {
    /// Open a database connection and initialize all schemas.
    pub fn from_path(path: &Path) -> Result<Self, Box<dyn Error>> {
        let db = Connection::open(path)?;
        let conn = Self { conn: db };
        conn.init_all_schemas()?;
        Ok(conn)
    }

    /// Initialize all schemas (idempotent, safe to call multiple times)
    pub fn init_all_schemas(&self) -> Result<(), rusqlite::Error> {
        // Authentication schema
        self.conn.execute_batch(sql::AUTH_SCHEMA)?;
        // Calendar schema
        self.conn.execute_batch(sql::calendar::CALENDAR_SCHEMA)?;
        self.conn
            .execute_batch(sql::calendar::CALENDAR_PERMISSIONS_SCHEMA)?;
        // Event schema
        self.conn.execute_batch(sql::event::EVENT_SCHEMA)?;
        // Recurring event schema
        self.conn.execute_batch(sql::recurring_event::SCHEMA)?;
        // User global permissions schema
        self.conn
            .execute_batch(sql::USER_GLOBAL_PERMISSIONS_SCHEMA)?;
        Ok(())
    }

    /// Initialize the authentication table schema
    pub fn init_auth_schema(&self) {
        self.conn
            .execute_batch(sql::AUTH_SCHEMA)
            .unwrap_or_else(|e| panic!("Invalid SQL in AUTH_SCHEMA: {}", e));
    }

    /// --- PERMISSIONS API ---

    /// Assign a permission to a user.
    pub fn assign_permission(&self, user_id: i64, permission: &str) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            sql::permissions::PERMISSIONS_INSERT,
            params![user_id, permission],
        )?;
        Ok(())
    }

    /// Remove a permission from a user.
    pub fn remove_permission(&self, user_id: i64, permission: &str) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            sql::permissions::PERMISSIONS_REMOVE,
            params![user_id, permission],
        )?;
        Ok(())
    }

    /// Check if a user has a specific permission.
    pub fn check_permission(
        &self,
        user_id: i64,
        permission: &str,
    ) -> Result<bool, rusqlite::Error> {
        let mut stmt = self.conn.prepare(sql::permissions::PERMISSIONS_CHECK)?;
        let mut rows = stmt.query(params![user_id, permission])?;
        Ok(rows.next()?.is_some())
    }

    /// List all permissions for a user.
    pub fn list_permissions(&self, user_id: i64) -> Result<Vec<String>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(sql::permissions::PERMISSIONS_LIST)?;
        let rows = stmt.query_map(params![user_id], |row| row.get::<_, String>(0))?;
        let mut result = Vec::new();
        for row in rows {
            if let Ok(perm) = row {
                result.push(perm);
            }
        }
        Ok(result)
    }

    /// Insert a new user into authentication table
    pub fn insert_user(
        &self,
        username: &str,
        password_hash: &str,
        salt: &str,
        email: &str,
    ) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            sql::AUTH_INSERT,
            params![username, password_hash, salt, email],
        )?;
        Ok(())
    }

    /// Update a user's password
    pub fn update_user_password(
        &self,
        username: &str,
        new_password_hash: &str,
    ) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            sql::AUTH_UPDATE_PASSWORD,
            params![username, new_password_hash],
        )?;
        Ok(())
    }

    /// Update a user's email
    pub fn update_user_email(
        &self,
        username: &str,
        new_email: &str,
    ) -> Result<(), rusqlite::Error> {
        self.conn
            .execute(sql::AUTH_UPDATE_EMAIL, params![username, new_email])?;
        Ok(())
    }

    /// Select a user by username
    pub fn get_user_by_username(
        &self,
        username: &str,
    ) -> Result<Option<AuthUser>, rusqlite::Error> {
        self.conn
            .query_row(sql::AUTH_SELECT_BY_USERNAME, params![username], |row| {
                Ok(AuthUser {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    password_hash: row.get(2)?,
                    salt: row.get(3)?,
                    email: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            })
            .optional()
    }

    /// Delete a user by username
    pub fn delete_user_by_username(&self, username: &str) -> Result<(), rusqlite::Error> {
        self.conn
            .execute(sql::AUTH_DELETE_BY_USERNAME, params![username])?;
        Ok(())
    }

    /// Get the salt for a user by username
    pub fn get_salt_by_username(&self, username: &str) -> Result<Option<String>, rusqlite::Error> {
        self.conn
            .query_row(
                crate::sql::AUTH_SELECT_SALT_BY_USERNAME,
                params![username],
                |row| row.get(0),
            )
            .optional()
    }
}

/// Struct representing a user in the authentication table

pub struct AuthUser {
    pub id: i64,

    pub username: String,

    pub password_hash: String,

    pub salt: String,

    pub email: String,

    pub created_at: String,

    pub updated_at: String,
}

/// Struct representing a calendar
use chrono::{DateTime, Utc};
use colorlab::Color;
use humantime::Duration as HumanDuration;

pub struct Calendar {
    pub id: i64,
    pub name: String,
    pub color: Color,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Struct representing a calendar permission for a user
pub struct CalendarPermission {
    pub user_id: i64,
    pub calendar_id: i64,
    pub can_admin: bool,
    pub can_view: bool,
    pub can_read: bool,
    pub can_add_event: bool,
    pub can_modify_event: bool,
    pub can_add_recurring_event: bool,
    pub can_modify_recurring_event: bool,
}

/// Struct representing an event in a calendar
pub struct Event {
    pub id: i64,
    pub calendar_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Struct representing a recurring event in a calendar

pub struct RecurringEvent {
    pub id: i64,

    pub calendar_id: i64,

    pub title: String,

    pub description: Option<String>,

    pub start_time: DateTime<Utc>,

    pub end_time: DateTime<Utc>,

    pub recurrence_type: String, // e.g. "daily", "weekly", etc.

    pub recurrence_interval: i64,

    pub recurrence_count: Option<i64>, // None = infinite

    pub recurrence_duration: Option<HumanDuration>,

    pub created_at: DateTime<Utc>,

    pub updated_at: DateTime<Utc>,
}

/// Struct representing a user's global permissions (e.g., global admin)
pub struct UserGlobalPermissions {
    pub user_id: i64,
    pub is_global_admin: bool,
}
