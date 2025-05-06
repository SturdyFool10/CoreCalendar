@echo off
SETLOCAL EnableDelayedExpansion

echo === Rust Workspace Initializer ===
echo This script will set up a Rust workspace structure.

REM Ask user for primary crate information
echo.
echo Please provide information for the primary crate:
set /p CRATE_NAME="Enter crate name: "

REM Validate crate name (basic validation only)
if "!CRATE_NAME!"=="" (
    echo Crate name cannot be empty!
    exit /b 1
)

REM Initialize workspace with a Cargo.toml
REM Initialize workspace with a Cargo.toml
echo Creating workspace Cargo.toml...
(
    echo [workspace]
    echo resolver = "3"
    echo members = [
    echo     "crates/*",
    echo ]
    echo default-members = [
    echo     "crates/!CRATE_NAME!",
    echo ]
) > Cargo.toml
echo Workspace Cargo.toml created.
echo Workspace Cargo.toml created.

REM Create crates directory
echo Creating crates directory...
mkdir crates
if %ERRORLEVEL% NEQ 0 (
    echo Failed to create crates directory!
    exit /b 1
)
echo Crates directory created.


REM Ask if it's a binary or library crate
set /p CRATE_TYPE="Is this a binary crate? (y/n, default is binary): "
if "!CRATE_TYPE!"=="" set CRATE_TYPE=y
echo.

REM Create the primary crate
cd crates
if /i "!CRATE_TYPE!"=="y" (
    echo Creating binary crate "!CRATE_NAME!" in crates/!CRATE_NAME!...
    cargo new !CRATE_NAME!
) else (
    echo Creating library crate "!CRATE_NAME!" in crates/!CRATE_NAME!...
    cargo new --lib !CRATE_NAME!
)

if %ERRORLEVEL% NEQ 0 (
    echo Failed to create crate "!CRATE_NAME!"
    cd ..
    exit /b 1
)


echo Workspace initialized successfully!
echo Primary crate "!CRATE_NAME!" created in crates/!CRATE_NAME!
echo.
echo Next steps:
echo - Review the workspace structure
echo - Add dependencies in crates/!CRATE_NAME!/Cargo.toml
if /i "!CRATE_TYPE!"=="y" (
    echo - Start coding in crates/!CRATE_NAME!/src/main.rs
) else (
    echo - Start coding in crates/!CRATE_NAME!/src/lib.rs
)

cd ..
ENDLOCAL