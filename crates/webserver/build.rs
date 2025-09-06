use std::env;
use std::path::Path;
use std::process::Command;

fn find_npm() -> Option<String> {
    // Try different npm executable names
    let npm_candidates = if cfg!(target_os = "windows") {
        vec!["npm.cmd", "npm.exe", "npm"]
    } else {
        vec!["npm"]
    };

    for npm_cmd in npm_candidates {
        if Command::new(npm_cmd).arg("--version").output().is_ok() {
            return Some(npm_cmd.to_string());
        }
    }

    None
}

fn main() {
    // Path to the html_src directory relative to the webserver crate root
    let html_src = Path::new("html_src");

    // Only run npm install/build if html_src exists
    if html_src.exists() {
        // Find npm executable
        let npm_cmd = match find_npm() {
            Some(cmd) => cmd,
            None => {
                println!(
                    "cargo:warning=npm not found in PATH. Please install Node.js from https://nodejs.org/"
                );
                println!("cargo:warning=Skipping npm build steps.");
                return;
            }
        };

        println!("cargo:warning=Found npm: {}", npm_cmd);

        // Run `npm install`
        let status = Command::new(&npm_cmd)
            .arg("install")
            .current_dir(&html_src)
            .status();

        match status {
            Ok(status) if status.success() => {
                println!("cargo:warning=npm install completed successfully");
            }
            Ok(_) => {
                println!("cargo:warning=npm install failed, but continuing build");
                return;
            }
            Err(e) => {
                println!("cargo:warning=Failed to run npm install: {}", e);
                return;
            }
        }

        // Run `npm run build`
        let status = Command::new(&npm_cmd)
            .arg("run")
            .arg("build")
            .current_dir(&html_src)
            .status();

        match status {
            Ok(status) if status.success() => {
                println!("cargo:warning=npm run build completed successfully");
            }
            Ok(_) => {
                println!("cargo:warning=npm run build failed, but continuing build");
            }
            Err(e) => {
                println!("cargo:warning=Failed to run npm run build: {}", e);
            }
        }
    } else {
        println!("cargo:warning=html_src directory not found, skipping npm build steps.");
    }

    // Invalidate the built crate whenever package.json or any file in html_src changes
    println!("cargo:rerun-if-changed=html_src/package.json");
    println!("cargo:rerun-if-changed=html_src/package-lock.json");
    println!("cargo:rerun-if-changed=html_src/");
}
