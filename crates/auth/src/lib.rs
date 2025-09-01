//! Secure authentication service built on top of the db crate.
//! - Registration: stores username, password hash, salt, and email if user doesn't exist, returns JWT.
//! - Salt retrieval: returns salt for username (if exists).
//! - Authentication: compares provided hash to stored hash, returns JWT if correct.

use db::{AuthUser, DatabaseConnection};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Error type for authentication operations.
#[derive(Debug)]
pub enum AuthError {
    UserAlreadyExists,
    UserNotFound,
    InvalidPassword,
    DbError(String),
    JwtError(String),
    RateLimitExceeded,
    Unauthorized,
}

/// Claims for JWT tokens.
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

/// AuthService provides secure authentication operations.
use global_constants::{DEFAULT_AUTH_RATE_LIMIT_PER_MINUTE, DEFAULT_JWT_EXPIRY_SECONDS};
use jsonwebtoken::{DecodingKey, Validation, decode};
use std::collections::HashMap;
use std::sync::Mutex;

pub struct AuthService {
    db: Arc<DatabaseConnection>,
    jwt_secret: String,
    jwt_expiry_seconds: usize,
    rate_limits: Mutex<HashMap<String, (u32, std::time::Instant)>>, // username -> (count, window_start)
}

impl AuthService {
    /// Create a new AuthService.
    pub fn new(
        db: Arc<DatabaseConnection>,
        jwt_secret: impl Into<String>,
        jwt_expiry_seconds: Option<usize>,
    ) -> Self {
        Self {
            db,
            jwt_secret: jwt_secret.into(),
            jwt_expiry_seconds: jwt_expiry_seconds
                .unwrap_or(global_constants::DEFAULT_JWT_EXPIRY_SECONDS),
            rate_limits: Mutex::new(HashMap::new()),
        }
    }

    /// Register a new user.
    /// Returns a JWT if successful, or an error if the user already exists.
    pub fn register_user(
        &self,
        username: &str,
        password_hash: &str,
        salt: &str,
        email: &str,
    ) -> Result<String, AuthError> {
        // Check if user exists
        match self.db.get_user_by_username(username) {
            Ok(Some(_)) => return Err(AuthError::UserAlreadyExists),
            Ok(None) => {}
            Err(e) => return Err(AuthError::DbError(format!("{:?}", e))),
        }

        // Insert user
        if let Err(e) = self.db.insert_user(username, password_hash, salt, email) {
            return Err(AuthError::DbError(format!("{:?}", e)));
        }

        // Issue JWT
        self.issue_jwt(username)
    }

    /// Retrieve the salt for a given username.
    pub fn get_salt(&self, username: &str) -> Result<String, AuthError> {
        self.check_rate_limit(username)?;
        match self.db.get_salt_by_username(username) {
            Ok(Some(salt)) => Ok(salt),
            Ok(None) => Err(AuthError::UserNotFound),
            Err(e) => Err(AuthError::DbError(format!("{:?}", e))),
        }
    }

    /// Authenticate a user by username and password hash.
    /// Returns a JWT if successful, or an error if authentication fails.
    pub fn authenticate_user(
        &self,
        username: &str,
        password_hash: &str,
    ) -> Result<String, AuthError> {
        self.check_rate_limit(username)?;
        let user = match self.db.get_user_by_username(username) {
            Ok(Some(user)) => user,
            Ok(None) => return Err(AuthError::UserNotFound),
            Err(e) => return Err(AuthError::DbError(format!("{:?}", e))),
        };

        if user.password_hash == password_hash {
            self.issue_jwt(username)
        } else {
            Err(AuthError::InvalidPassword)
        }
    }

    /// Change a user's password (requires JWT for authentication).
    pub fn change_password(
        &self,
        username: &str,
        new_password_hash: &str,
        jwt: &str,
    ) -> Result<(), AuthError> {
        // Validate JWT
        self.validate_jwt(jwt, username)?;

        // Update password in DB
        self.db
            .update_user_password(username, new_password_hash)
            .map_err(|e| AuthError::DbError(format!("{:?}", e)))
    }

    /// Helper to issue a JWT for a username.
    fn issue_jwt(&self, username: &str) -> Result<String, AuthError> {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs() as usize;
        let claims = Claims {
            sub: username.to_owned(),
            exp: now + self.jwt_expiry_seconds,
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
        .map_err(|e| AuthError::JwtError(format!("{:?}", e)))
    }

    /// Validate a JWT for a given username.
    pub fn validate_jwt(&self, jwt: &str, username: &str) -> Result<(), AuthError> {
        let validation = Validation::default();
        let token_data = decode::<Claims>(
            jwt,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(|_| AuthError::Unauthorized)?;

        if token_data.claims.sub == username {
            Ok(())
        } else {
            Err(AuthError::Unauthorized)
        }
    }

    /// Per-user rate limiting (requests per minute).
    fn check_rate_limit(&self, username: &str) -> Result<(), AuthError> {
        use std::time::{Duration, Instant};
        let mut limits = self.rate_limits.lock().unwrap();
        let now = Instant::now();
        let entry = limits.entry(username.to_string()).or_insert((0, now));
        let window = Duration::from_secs(60);

        if now.duration_since(entry.1) > window {
            // Reset window
            entry.0 = 1;
            entry.1 = now;
            Ok(())
        } else {
            if entry.0 < DEFAULT_AUTH_RATE_LIMIT_PER_MINUTE {
                entry.0 += 1;
                Ok(())
            } else {
                Err(AuthError::RateLimitExceeded)
            }
        }
    }

    /// Optionally, get user info (without password hash or salt).
    pub fn get_user(&self, username: &str) -> Result<Option<SafeUser>, AuthError> {
        match self.db.get_user_by_username(username) {
            Ok(Some(user)) => Ok(Some(SafeUser::from(user))),
            Ok(None) => Ok(None),
            Err(e) => Err(AuthError::DbError(format!("{:?}", e))),
        }
    }
}

/// A safe user struct that does not expose password hash or salt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafeUser {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<AuthUser> for SafeUser {
    fn from(user: AuthUser) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}
