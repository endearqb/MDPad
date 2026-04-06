use std::fs;
use std::path::PathBuf;

fn ensure_resource_placeholders() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let resources_dir = manifest_dir.join("resources");

    for relative_dir in [
        "node-runtime",
        "export-doc-builder",
        "marknative-renderer",
        "playwright-pdf",
        "cli",
    ] {
        let _ = fs::create_dir_all(resources_dir.join(relative_dir));
    }

    let cli_path = resources_dir.join("cli").join("mdpad-cli.exe");
    if !cli_path.exists() {
        let _ = fs::write(cli_path, []);
    }
}

fn main() {
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.icns");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=resources/cli/mdpad-cli.exe");
    ensure_resource_placeholders();
    tauri_build::build()
}
