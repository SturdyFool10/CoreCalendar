use rusqlite::{Connection, OptionalExtension, params};
use std::error::Error;
use std::path::Path;

pub mod sql;

pub struct DatabaseConnection {
    pub conn: Connection,
}

impl DatabaseConnection {
    pub fn from_path(path: &Path) -> Result<Self, Box<dyn Error>> {
        if !path.exists() {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Database file not found: {:?}", path),
            )));
        } else {
            let db = Connection::open(path)?;
            Ok(Self { conn: db })
        }
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
