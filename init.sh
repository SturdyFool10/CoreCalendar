#!/bin/bash

echo "=== Rust Workspace Initializer ==="
echo "This script will set up a Rust workspace structure."

# Ask user for primary crate information
echo
echo "Please provide information for the primary crate:"
read -p "Enter crate name: " CRATE_NAME

# Validate crate name (basic validation only)
if [ -z "$CRATE_NAME" ]; then
    echo "Crate name cannot be empty!"
    exit 1
fi

# Initialize workspace with a Cargo.toml
echo "Creating workspace Cargo.toml..."
cat << EOF > Cargo.toml
[workspace]
resolver = "3"
members = [
    "crates/*",
]
default-members = [
    "crates/$CRATE_NAME",
]
EOF
echo "Workspace Cargo.toml created."

# Create crates directory
echo "Creating crates directory..."
mkdir -p crates
if [ $? -ne 0 ]; then
    echo "Failed to create crates directory!"
    exit 1
fi
echo "Crates directory created."

# Ask if it's a binary or library crate
read -p "Is this a binary crate? (y/n, default is binary): " CRATE_TYPE
CRATE_TYPE=${CRATE_TYPE:-y}
echo

# Create the primary crate
cd crates
if [[ "${CRATE_TYPE,,}" == "y" ]]; then
    echo "Creating binary crate \"$CRATE_NAME\" in crates/$CRATE_NAME..."
    cargo new "$CRATE_NAME"
else
    echo "Creating library crate \"$CRATE_NAME\" in crates/$CRATE_NAME..."
    cargo new --lib "$CRATE_NAME"
fi

if [ $? -ne 0 ]; then
    echo "Failed to create crate \"$CRATE_NAME\""
    cd ..
    exit 1
fi

echo "Workspace initialized successfully!"
echo "Primary crate \"$CRATE_NAME\" created in crates/$CRATE_NAME"
echo
echo "Next steps:"
echo "- Review the workspace structure"
echo "- Add dependencies in crates/$CRATE_NAME/Cargo.toml"
if [[ "${CRATE_TYPE,,}" == "y" ]]; then
    echo "- Start coding in crates/$CRATE_NAME/src/main.rs"
else
    echo "- Start coding in crates/$CRATE_NAME/src/lib.rs"
fi

cd ..