use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, Manager, Window};

#[derive(Default)]
struct InitialFileState(Mutex<Option<String>>);

#[derive(Clone, Serialize)]
struct OpenFilePayload {
    path: String,
}

fn is_markdown_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase()),
        Some(ext) if ext == "md" || ext == "markdown"
    )
}

fn normalize_path(path: PathBuf) -> String {
    match path.canonicalize() {
        Ok(canonical) => canonical.to_string_lossy().into_owned(),
        Err(_) => path.to_string_lossy().into_owned(),
    }
}

fn extract_markdown_path(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }

        let candidate = PathBuf::from(arg);
        if is_markdown_file(&candidate) {
            return Some(normalize_path(candidate));
        }
    }
    None
}

#[tauri::command]
fn get_initial_file(state: tauri::State<'_, InitialFileState>) -> Result<Option<String>, String> {
    let lock = state
        .0
        .lock()
        .map_err(|_| "failed to access initial file state".to_string())?;
    Ok(lock.clone())
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .pick_file();
    Ok(file.map(|path| path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn save_file_as_dialog(default_name: String) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .set_file_name(default_name)
        .add_filter("Markdown", &["md", "markdown"])
        .save_file();
    Ok(file.map(|path| path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("Failed to read file: {error}"))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| format!("Failed to write file: {error}"))
}

#[tauri::command]
fn focus_main_window(window: Window) -> Result<(), String> {
    window
        .set_focus()
        .map_err(|error| format!("Failed to focus window: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_file = extract_markdown_path(&std::env::args().collect::<Vec<_>>());

    tauri::Builder::default()
        .manage(InitialFileState(Mutex::new(initial_file)))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = extract_markdown_path(&argv) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                    let _ = window.emit("app://open-file", OpenFilePayload { path });
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_initial_file,
            open_file_dialog,
            save_file_as_dialog,
            read_text_file,
            write_text_file,
            focus_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDPad");
}
