extern crate async_trait;
use ::async_trait::async_trait;
use db;
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::sync::Mutex;

/// Represents a unique user identifier.
/// In a real system, this could be a UUID, i64, or String.
pub type UserId = i64;

/// Represents a permission.
/// You can extend this enum as needed for your application.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Permission {
    Read,
    Write,
    Delete,
    Admin,
    Custom(String), // For extensibility
}

/// A set of permissions.
#[derive(Debug, Clone, Default)]
pub struct PermissionSet {
    permissions: HashSet<Permission>,
}

impl PermissionSet {
    pub fn new() -> Self {
        Self {
            permissions: HashSet::new(),
        }
    }

    pub fn insert(&mut self, permission: Permission) {
        self.permissions.insert(permission);
    }

    pub fn remove(&mut self, permission: &Permission) {
        self.permissions.remove(permission);
    }

    pub fn contains(&self, permission: &Permission) -> bool {
        self.permissions.contains(permission)
    }

    pub fn list(&self) -> Vec<Permission> {
        self.permissions.iter().cloned().collect()
    }
}

#[async_trait]
pub trait PermissionBackend: Send + Sync {
    async fn assign_permission(&self, user: UserId, permission: Permission);

    async fn remove_permission(&self, user: UserId, permission: &Permission);

    async fn check_permission(&self, user: UserId, permission: &Permission) -> bool;
    async fn list_permissions(&self, user: UserId) -> Vec<Permission>;
}

/// In-memory implementation of PermissionBackend.
#[derive(Default)]
pub struct InMemoryPermissionBackend {
    // Maps user IDs to their set of permissions.
    user_permissions: Mutex<HashMap<UserId, PermissionSet>>,
}

impl InMemoryPermissionBackend {
    pub fn new() -> Self {
        Self {
            user_permissions: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait]
#[async_trait]
impl PermissionBackend for InMemoryPermissionBackend {
    async fn assign_permission(&self, user: UserId, permission: Permission) {
        let mut perms = self.user_permissions.lock().await;
        perms
            .entry(user)
            .or_insert_with(PermissionSet::new)
            .insert(permission);
    }

    async fn remove_permission(&self, user: UserId, permission: &Permission) {
        let mut perms = self.user_permissions.lock().await;
        if let Some(set) = perms.get_mut(&user) {
            set.remove(permission);
        }
    }

    async fn check_permission(&self, user: UserId, permission: &Permission) -> bool {
        let perms = self.user_permissions.lock().await;
        perms
            .get(&user)
            .map_or(false, |set| set.contains(permission))
    }

    async fn list_permissions(&self, user: UserId) -> Vec<Permission> {
        let perms = self.user_permissions.lock().await;
        perms.get(&user).map_or(vec![], |set| set.list())
    }
}

/// Database-backed implementation of PermissionBackend.
pub struct DbPermissionBackend {
    db: Arc<Mutex<db::DatabaseConnection>>,
}

impl DbPermissionBackend {
    pub fn new(db: Arc<Mutex<db::DatabaseConnection>>) -> Self {
        Self { db }
    }
}

#[async_trait]
#[async_trait]
impl PermissionBackend for DbPermissionBackend {
    async fn assign_permission(&self, user: UserId, permission: Permission) {
        let perm_str = permission_to_string(&permission);
        let db = self.db.lock().await;
        let _ = db.assign_permission(user, &perm_str);
    }

    async fn remove_permission(&self, user: UserId, permission: &Permission) {
        let perm_str = permission_to_string(permission);
        let db = self.db.lock().await;
        let _ = db.remove_permission(user, &perm_str);
    }

    async fn check_permission(&self, user: UserId, permission: &Permission) -> bool {
        let perm_str = permission_to_string(permission);
        let db = self.db.lock().await;
        match db.check_permission(user, &perm_str) {
            Ok(has) => has,
            Err(_) => false,
        }
    }

    async fn list_permissions(&self, user: UserId) -> Vec<Permission> {
        let db = self.db.lock().await;
        match db.list_permissions(user) {
            Ok(perms) => perms
                .into_iter()
                .filter_map(|s| string_to_permission(&s))
                .collect(),
            Err(_) => Vec::new(),
        }
    }
}

fn permission_to_string(permission: &Permission) -> String {
    match permission {
        Permission::Read => "read".to_string(),
        Permission::Write => "write".to_string(),
        Permission::Delete => "delete".to_string(),
        Permission::Admin => "admin".to_string(),
        Permission::Custom(s) => s.clone(),
    }
}

fn string_to_permission(s: &str) -> Option<Permission> {
    match s {
        "read" => Some(Permission::Read),
        "write" => Some(Permission::Write),
        "delete" => Some(Permission::Delete),
        "admin" => Some(Permission::Admin),
        other => Some(Permission::Custom(other.to_string())),
    }
}

/// The main API for managing permissions.
pub struct PermissionsManager<B: PermissionBackend> {
    backend: B,
}

impl<B: PermissionBackend> PermissionsManager<B> {
    /// Create a new PermissionsManager with the given backend.
    pub fn new(backend: B) -> Self {
        Self { backend }
    }

    /// Assign a permission to a user.
    pub async fn assign_permission(&self, user: UserId, permission: Permission) {
        self.backend.assign_permission(user, permission).await;
    }

    /// Remove a permission from a user.
    pub async fn remove_permission(&self, user: UserId, permission: &Permission) {
        self.backend.remove_permission(user, permission).await;
    }

    /// Check if a user has a specific permission.
    pub async fn check_permission(&self, user: UserId, permission: &Permission) -> bool {
        self.backend.check_permission(user, permission).await
    }

    /// List all permissions for a user.
    pub async fn list_permissions(&self, user: UserId) -> Vec<Permission> {
        self.backend.list_permissions(user).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio;

    #[tokio::test]
    async fn test_permission_api() {
        let backend = InMemoryPermissionBackend::new();
        let manager = PermissionsManager::new(backend);

        let user = 42;
        let perm_read = Permission::Read;
        let perm_write = Permission::Write;

        // Initially, user has no permissions
        assert!(!manager.check_permission(user, &perm_read).await);
        assert!(manager.list_permissions(user).await.is_empty());

        // Assign permission
        manager.assign_permission(user, perm_read.clone()).await;
        assert!(manager.check_permission(user, &perm_read).await);
        assert_eq!(
            manager.list_permissions(user).await,
            vec![perm_read.clone()]
        );

        // Assign another permission
        manager.assign_permission(user, perm_write.clone()).await;
        let perms = manager.list_permissions(user).await;
        assert!(perms.contains(&perm_read));
        assert!(perms.contains(&perm_write));

        // Remove permission
        manager.remove_permission(user, &perm_read).await;
        assert!(!manager.check_permission(user, &perm_read).await);
        assert!(manager.check_permission(user, &perm_write).await);
    }
}
