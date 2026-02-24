use std::fs;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Manager, WebviewWindowBuilder, Window};

struct InitialFileState(Mutex<HashMap<String, Option<String>>>);

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
fn get_initial_file(
    window: Window,
    state: tauri::State<'_, InitialFileState>
) -> Result<Option<String>, String> {
    let mut lock = state
        .0
        .lock()
        .map_err(|_| "failed to access initial file state".to_string())?;
    Ok(lock.remove(window.label()).flatten())
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

fn normalize_markdown_path(path: String) -> Result<String, String> {
    let candidate = PathBuf::from(path);
    if !is_markdown_file(&candidate) {
        return Err("Only .md/.markdown files can be opened in MDPad.".to_string());
    }
    Ok(normalize_path(candidate))
}

fn next_document_window_label(app: &tauri::AppHandle) -> String {
    let mut index = 1_u64;
    loop {
        let label = format!("doc-{index}");
        if app.get_webview_window(&label).is_none() {
            return label;
        }
        index += 1;
    }
}

fn create_document_window_internal(
    app: &tauri::AppHandle,
    path: Option<String>
) -> Result<(), String> {
    let normalized_path = match path {
        Some(raw_path) => Some(normalize_markdown_path(raw_path)?),
        None => None
    };

    let mut window_config = app
        .config()
        .app
        .windows
        .first()
        .cloned()
        .ok_or_else(|| "No window configuration found.".to_string())?;

    let label = next_document_window_label(app);
    window_config.label = label.clone();

    {
        let state = app.state::<InitialFileState>();
        let mut lock = state
            .0
            .lock()
            .map_err(|_| "failed to access initial file state".to_string())?;
        lock.insert(label.clone(), normalized_path);
    }

    let build_result = WebviewWindowBuilder::from_config(app, &window_config)
        .map_err(|error| format!("Failed to prepare window: {error}"))?
        .build()
        .map_err(|error| format!("Failed to build window: {error}"));

    if let Err(error) = build_result {
        let state = app.state::<InitialFileState>();
        if let Ok(mut lock) = state.0.lock() {
            let _ = lock.remove(label.as_str());
        }
        return Err(error);
    }

    Ok(())
}

#[tauri::command]
async fn create_document_window(
    app: tauri::AppHandle,
    path: Option<String>
) -> Result<(), String> {
    create_document_window_internal(&app, path)
}

fn has_invalid_windows_name_characters(value: &str) -> bool {
    value
        .chars()
        .any(|char| matches!(char, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
}

#[tauri::command]
fn rename_file(path: String, new_base_name: String) -> Result<String, String> {
    let source_path = PathBuf::from(&path);
    if !source_path.exists() {
        return Err("File does not exist.".to_string());
    }
    if !is_markdown_file(&source_path) {
        return Err("Only .md/.markdown files can be renamed.".to_string());
    }

    let trimmed_name = new_base_name.trim();
    if trimmed_name.is_empty() {
        return Err("File name cannot be empty.".to_string());
    }
    if has_invalid_windows_name_characters(trimmed_name) {
        return Err("File name contains invalid characters.".to_string());
    }
    if trimmed_name.ends_with('.') || trimmed_name.ends_with(' ') {
        return Err("File name cannot end with dot or space.".to_string());
    }

    let parent = source_path
        .parent()
        .ok_or_else(|| "Unable to resolve parent directory.".to_string())?;
    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or_else(|| "Unable to resolve file extension.".to_string())?;

    let target_path = parent.join(format!("{trimmed_name}.{extension}"));
    if target_path == source_path {
        return Ok(normalize_path(source_path));
    }
    if target_path.exists() {
        return Err("A file with the same name already exists.".to_string());
    }

    fs::rename(&source_path, &target_path)
        .map_err(|error| format!("Failed to rename file: {error}"))?;
    Ok(normalize_path(target_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_file = extract_markdown_path(&std::env::args().collect::<Vec<_>>());
    let mut initial_file_map = HashMap::new();
    initial_file_map.insert("main".to_string(), initial_file);

    tauri::Builder::default()
        .manage(InitialFileState(Mutex::new(initial_file_map)))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = extract_markdown_path(&argv) {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = create_document_window_internal(&app_handle, Some(path));
                });
                return;
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_initial_file,
            open_file_dialog,
            save_file_as_dialog,
            read_text_file,
            write_text_file,
            rename_file,
            create_document_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDPad");
}
