use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::path::BaseDirectory;
use tauri::{Manager, WebviewWindowBuilder, Window};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

pub mod export_service;

struct InitialFileState(Mutex<HashMap<String, Option<String>>>);
struct AttachmentLibraryState(Mutex<Option<String>>);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportMarkdownPagesInput {
    markdown: String,
    output_dir: String,
    format: String,
    scope: String,
    theme: String,
    base_name: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RendererRequest {
    markdown: String,
    temp_dir: String,
    format: String,
    theme: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RendererResult {
    files: Vec<String>,
    page_count: usize,
    format: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    files: Vec<String>,
    page_count: usize,
    output_dir: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocumentPdfInput {
    html: String,
    output_file_path: String,
    scope: String,
    render_width: u32,
    emulation_profile: String,
    respect_page_css_size: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PdfRendererRequest {
    kind: String,
    html_path: String,
    output_path: String,
    viewport_width: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PdfRendererResult {
    file: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocumentPdfResult {
    file: String,
    output_dir: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocumentImageInput {
    html: String,
    output_file_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocumentImageResult {
    file: String,
    output_dir: String,
}

fn is_supported_text_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext.to_ascii_lowercase()),
        Some(ext)
            if matches!(
                ext.as_str(),
                "md" | "markdown" | "html" | "htm" | "py" | "js" | "ts" | "json"
            )
    )
}

#[cfg(target_os = "windows")]
fn strip_windows_verbatim_prefix(path: String) -> String {
    if let Some(stripped) = path.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{stripped}");
    }
    if let Some(stripped) = path.strip_prefix(r"\\?\") {
        return stripped.to_string();
    }
    path
}

#[cfg(not(target_os = "windows"))]
fn strip_windows_verbatim_prefix(path: String) -> String {
    path
}

fn normalize_path(path: PathBuf) -> String {
    let normalized = match path.canonicalize() {
        Ok(canonical) => canonical.to_string_lossy().into_owned(),
        Err(_) => path.to_string_lossy().into_owned(),
    };

    strip_windows_verbatim_prefix(normalized)
}

fn extract_supported_text_path(args: &[String]) -> Option<String> {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }

        let candidate = PathBuf::from(arg);
        if is_supported_text_file(&candidate) {
            return Some(normalize_path(candidate));
        }
    }
    None
}

#[tauri::command]
fn get_initial_file(
    window: Window,
    state: tauri::State<'_, InitialFileState>,
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
        .add_filter(
            "Supported Text Files",
            &["md", "markdown", "html", "htm", "py", "js", "ts", "json"],
        )
        .pick_file();
    Ok(file.map(|path| path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn save_file_as_dialog(default_name: Option<String>) -> Result<Option<String>, String> {
    let suggested_name = default_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("untitled");

    let file = rfd::FileDialog::new()
        .set_file_name(suggested_name)
        .add_filter(
            "Supported Text Files",
            &["md", "markdown", "html", "htm", "py", "js", "ts", "json"],
        )
        .save_file();
    Ok(file.map(|path| path.to_string_lossy().into_owned()))
}

fn sanitize_attachment_file_name(file_name: &str) -> Result<String, String> {
    let trimmed = file_name.trim();
    if trimmed.is_empty() {
        return Err("File name cannot be empty.".to_string());
    }

    let base_name = Path::new(trimmed)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "File name is invalid.".to_string())?;

    let sanitized: String = base_name
        .chars()
        .map(|char| {
            if char.is_ascii_control()
                || matches!(char, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            {
                '_'
            } else {
                char
            }
        })
        .collect();

    let normalized = sanitized
        .trim_matches(|char| char == '.' || char == ' ')
        .trim()
        .to_string();
    if normalized.is_empty() {
        return Err("File name is invalid.".to_string());
    }

    Ok(normalized)
}

fn split_file_name(file_name: &str) -> (String, String) {
    let path = Path::new(file_name);
    let base_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("image")
        .to_string();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_string();
    (base_name, extension)
}

fn next_available_file_path(directory: &Path, file_name: &str) -> PathBuf {
    let initial_candidate = directory.join(file_name);
    if !initial_candidate.exists() {
        return initial_candidate;
    }

    let (base_name, extension) = split_file_name(file_name);
    for index in 1..=9_999 {
        let candidate_name = if extension.is_empty() {
            format!("{base_name}-{index}")
        } else {
            format!("{base_name}-{index}.{extension}")
        };
        let candidate_path = directory.join(candidate_name);
        if !candidate_path.exists() {
            return candidate_path;
        }
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let fallback_name = if extension.is_empty() {
        format!("{base_name}-{timestamp}")
    } else {
        format!("{base_name}-{timestamp}.{extension}")
    };
    directory.join(fallback_name)
}

fn sanitize_export_base_name(base_name: &str) -> String {
    let trimmed = base_name.trim();
    if trimmed.is_empty() {
        return "untitled".to_string();
    }

    let sanitized: String = trimmed
        .chars()
        .map(|char| {
            if char.is_ascii_control()
                || matches!(char, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            {
                '_'
            } else {
                char
            }
        })
        .collect();

    let normalized = sanitized
        .trim_matches(|char| char == '.' || char == ' ')
        .trim()
        .to_string();
    if normalized.is_empty() {
        "untitled".to_string()
    } else {
        normalized
    }
}

fn normalize_image_export_format(format: &str) -> Result<&'static str, String> {
    match format.trim().to_ascii_lowercase().as_str() {
        "png" => Ok("png"),
        "svg" => Ok("svg"),
        _ => Err("Image export format must be png or svg.".to_string()),
    }
}

fn normalize_export_scope(scope: &str) -> Result<&'static str, String> {
    match scope.trim().to_ascii_lowercase().as_str() {
        "selection" => Ok("selection"),
        "document" => Ok("document"),
        _ => Err("Export scope must be selection or document.".to_string()),
    }
}

fn normalize_markdown_theme(theme: &str) -> &'static str {
    match theme.trim() {
        "github" => "github",
        "academic" => "academic",
        "notionish" => "notionish",
        _ => "default",
    }
}

fn build_export_batch_base_name(base_name: &str, scope: &str) -> String {
    if scope == "selection" {
        format!("{base_name}-selection")
    } else {
        base_name.to_string()
    }
}

#[cfg(test)]
fn build_export_file_name(base_name: &str, scope: &str, extension: &str) -> String {
    let scoped_base_name = build_export_batch_base_name(base_name, scope);
    format!("{scoped_base_name}.{extension}")
}

fn build_export_page_file_name(base_name: &str, extension: &str, page_index: usize) -> String {
    format!("{base_name}-page-{:02}.{extension}", page_index + 1)
}

fn is_export_batch_available(
    directory: &Path,
    base_name: &str,
    extension: &str,
    page_count: usize,
) -> bool {
    !(0..page_count).any(|page_index| {
        directory
            .join(build_export_page_file_name(
                base_name, extension, page_index,
            ))
            .exists()
    })
}

fn find_available_export_batch_base_name(
    directory: &Path,
    base_name: &str,
    extension: &str,
    page_count: usize,
) -> String {
    if is_export_batch_available(directory, base_name, extension, page_count) {
        return base_name.to_string();
    }

    for index in 1..=9_999 {
        let candidate = format!("{base_name}-{index}");
        if is_export_batch_available(directory, &candidate, extension, page_count) {
            return candidate;
        }
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{base_name}-{timestamp}")
}

fn create_temp_directory(prefix: &str) -> Result<PathBuf, String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let directory =
        std::env::temp_dir().join(format!("{prefix}-{}-{timestamp}", std::process::id()));
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Failed to create export temp directory: {error}"))?;
    Ok(directory)
}

fn create_temp_export_directory() -> Result<PathBuf, String> {
    create_temp_directory("mdpad-marknative")
}

struct RendererPaths {
    node_path: PathBuf,
    script_path: PathBuf,
    working_dir: PathBuf,
}

struct PdfRendererPaths {
    node_path: PathBuf,
    script_path: PathBuf,
    working_dir: PathBuf,
}

fn resolve_renderer_paths(app: &tauri::AppHandle) -> Result<RendererPaths, String> {
    let bundled_node = app
        .path()
        .resolve(
            "marknative-renderer/runtime/node.exe",
            BaseDirectory::Resource,
        )
        .map_err(|error| format!("Failed to resolve bundled renderer runtime: {error}"))?;
    let bundled_script = app
        .path()
        .resolve(
            "marknative-renderer/app/renderer.mjs",
            BaseDirectory::Resource,
        )
        .map_err(|error| format!("Failed to resolve bundled renderer script: {error}"))?;

    if bundled_node.exists() && bundled_script.exists() {
        let working_dir = bundled_script
            .parent()
            .ok_or_else(|| "Bundled renderer script directory is invalid.".to_string())?
            .to_path_buf();
        return Ok(RendererPaths {
            node_path: bundled_node,
            script_path: bundled_script,
            working_dir,
        });
    }

    let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Failed to resolve workspace root.".to_string())?
        .to_path_buf();
    let dev_script = workspace_root
        .join("scripts")
        .join("marknative-renderer-src")
        .join("runner.mjs");
    if !dev_script.exists() {
        return Err("Markdown renderer script was not found.".to_string());
    }

    Ok(RendererPaths {
        node_path: PathBuf::from("node"),
        script_path: dev_script,
        working_dir: workspace_root,
    })
}

fn resolve_pdf_renderer_paths(app: &tauri::AppHandle) -> Result<PdfRendererPaths, String> {
    let bundled_node = app
        .path()
        .resolve("playwright-pdf/runtime/node.exe", BaseDirectory::Resource)
        .map_err(|error| format!("Failed to resolve bundled PDF runtime: {error}"))?;
    let bundled_script = app
        .path()
        .resolve("playwright-pdf/app/runner.mjs", BaseDirectory::Resource)
        .map_err(|error| format!("Failed to resolve bundled PDF renderer script: {error}"))?;

    if bundled_node.exists() && bundled_script.exists() {
        let working_dir = bundled_script
            .parent()
            .ok_or_else(|| "Bundled PDF renderer script directory is invalid.".to_string())?
            .to_path_buf();
        return Ok(PdfRendererPaths {
            node_path: bundled_node,
            script_path: bundled_script,
            working_dir,
        });
    }

    let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Failed to resolve workspace root.".to_string())?
        .to_path_buf();
    let dev_script = workspace_root
        .join("scripts")
        .join("playwright-pdf-src")
        .join("runner.mjs");
    if !dev_script.exists() {
        return Err("PDF renderer script was not found.".to_string());
    }

    Ok(PdfRendererPaths {
        node_path: PathBuf::from("node"),
        script_path: dev_script,
        working_dir: workspace_root,
    })
}

#[cfg(target_os = "windows")]
fn configure_hidden_child_window(command: &mut Command) {
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn configure_hidden_child_window(_command: &mut Command) {}

fn run_renderer(
    app: &tauri::AppHandle,
    request: RendererRequest,
) -> Result<RendererResult, String> {
    let renderer_paths = resolve_renderer_paths(app)?;
    let request_json = serde_json::to_vec(&request)
        .map_err(|error| format!("Failed to encode renderer request: {error}"))?;

    let mut command = Command::new(&renderer_paths.node_path);
    command
        .arg(&renderer_paths.script_path)
        .current_dir(&renderer_paths.working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_hidden_child_window(&mut command);

    let mut child = command.spawn().map_err(|error| {
            format!(
                "Failed to start markdown renderer. Rebuild MDPad or install Node.js for development. {error}"
            )
        })?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(&request_json)
            .map_err(|error| format!("Failed to send renderer request: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for markdown renderer: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let detail = if stderr.is_empty() {
            "Markdown renderer exited with a non-zero status.".to_string()
        } else {
            stderr
        };
        return Err(format!("Markdown export failed: {detail}"));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Failed to decode renderer response: {error}"))
}

fn run_pdf_renderer(
    app: &tauri::AppHandle,
    request: PdfRendererRequest,
) -> Result<PdfRendererResult, String> {
    let renderer_paths = resolve_pdf_renderer_paths(app)?;
    let request_json = serde_json::to_vec(&request)
        .map_err(|error| format!("Failed to encode PDF renderer request: {error}"))?;

    let mut command = Command::new(&renderer_paths.node_path);
    command
        .arg(&renderer_paths.script_path)
        .current_dir(&renderer_paths.working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    configure_hidden_child_window(&mut command);

    let mut child = command.spawn().map_err(|error| {
            format!(
                "Failed to start PDF renderer. Rebuild MDPad or install Node.js for development. {error}"
            )
        })?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(&request_json)
            .map_err(|error| format!("Failed to send PDF renderer request: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for PDF renderer: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let detail = if stderr.is_empty() {
            "PDF renderer exited with a non-zero status.".to_string()
        } else {
            stderr
        };
        return Err(format!("PDF export failed: {detail}"));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Failed to decode PDF renderer response: {error}"))
}

fn move_renderer_outputs(
    source_files: &[String],
    output_dir: &Path,
    base_name: &str,
    extension: &str,
    scope: &str,
) -> Result<Vec<String>, String> {
    let scoped_base_name = build_export_batch_base_name(base_name, scope);
    let final_base_name = find_available_export_batch_base_name(
        output_dir,
        &scoped_base_name,
        extension,
        source_files.len(),
    );

    source_files
        .iter()
        .enumerate()
        .map(|(page_index, source_path)| {
            let source_path_buf = PathBuf::from(source_path);
            if !source_path_buf.exists() {
                return Err("Markdown renderer output file is missing.".to_string());
            }

            let destination_path = output_dir.join(build_export_page_file_name(
                &final_base_name,
                extension,
                page_index,
            ));
            fs::copy(&source_path_buf, &destination_path)
                .map_err(|error| format!("Failed to save exported page: {error}"))?;
            let _ = fs::remove_file(&source_path_buf);

            Ok(normalize_path(destination_path))
        })
        .collect()
}

#[tauri::command]
fn pick_attachment_library_dir() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new().pick_folder();
    Ok(folder.map(normalize_path))
}

#[tauri::command]
fn pick_export_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new().pick_folder();
    Ok(folder.map(normalize_path))
}

#[tauri::command]
fn save_export_pdf_dialog(default_name: Option<String>) -> Result<Option<String>, String> {
    let suggested_name = default_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("untitled.pdf");

    let file = rfd::FileDialog::new()
        .set_file_name(suggested_name)
        .add_filter("PDF Document", &["pdf"])
        .save_file();
    Ok(file.map(normalize_path))
}

#[tauri::command]
fn get_attachment_library_dir(
    state: tauri::State<'_, AttachmentLibraryState>,
) -> Result<Option<String>, String> {
    let lock = state
        .0
        .lock()
        .map_err(|_| "failed to access attachment library state".to_string())?;
    Ok(lock.clone())
}

#[tauri::command]
fn set_attachment_library_dir(
    path: String,
    state: tauri::State<'_, AttachmentLibraryState>,
) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Attachment library directory cannot be empty.".to_string());
    }

    let candidate = PathBuf::from(trimmed);
    if candidate.exists() {
        if !candidate.is_dir() {
            return Err("Attachment library path must be a directory.".to_string());
        }
    } else {
        fs::create_dir_all(&candidate)
            .map_err(|error| format!("Failed to create attachment library directory: {error}"))?;
    }

    let normalized = normalize_path(candidate);
    let mut lock = state
        .0
        .lock()
        .map_err(|_| "failed to access attachment library state".to_string())?;
    *lock = Some(normalized);

    Ok(())
}

fn save_attachment_bytes_to_library_impl(
    file_name: String,
    bytes: Vec<u8>,
    state: &tauri::State<'_, AttachmentLibraryState>,
) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("Attachment data is empty.".to_string());
    }

    let attachment_dir = {
        let lock = state
            .0
            .lock()
            .map_err(|_| "failed to access attachment library state".to_string())?;
        lock.clone()
            .ok_or_else(|| "Attachment library directory is not set.".to_string())?
    };

    let directory = PathBuf::from(attachment_dir);
    if directory.exists() {
        if !directory.is_dir() {
            return Err("Attachment library path must be a directory.".to_string());
        }
    } else {
        fs::create_dir_all(&directory)
            .map_err(|error| format!("Failed to create attachment library directory: {error}"))?;
    }

    let sanitized_name = sanitize_attachment_file_name(&file_name)?;
    let target_path = next_available_file_path(&directory, &sanitized_name);
    fs::write(&target_path, bytes)
        .map_err(|error| format!("Failed to save attachment file: {error}"))?;

    Ok(normalize_path(target_path))
}

#[tauri::command]
fn save_attachment_bytes_to_library(
    file_name: String,
    bytes: Vec<u8>,
    state: tauri::State<'_, AttachmentLibraryState>,
) -> Result<String, String> {
    save_attachment_bytes_to_library_impl(file_name, bytes, &state)
}

#[tauri::command]
fn export_markdown_pages(
    app: tauri::AppHandle,
    input: ExportMarkdownPagesInput,
) -> Result<ExportResult, String> {
    let result = export_service::export_markdown_pages_from_app(
        &app,
        export_service::MarkdownExportRequest {
            markdown: input.markdown,
            output_dir: input.output_dir,
            format: input.format,
            scope: input.scope,
            theme: input.theme,
            base_name: input.base_name,
        },
    )?;

    Ok(ExportResult {
        files: result.files,
        page_count: result.page_count,
        output_dir: result.output_dir,
    })
}

#[tauri::command]
fn export_document_pdf(
    app: tauri::AppHandle,
    input: ExportDocumentPdfInput,
) -> Result<ExportDocumentPdfResult, String> {
    let result = export_service::export_document_pdf_from_app(
        &app,
        export_service::DocumentPdfExportRequest {
            html: input.html,
            output_file_path: input.output_file_path,
            scope: input.scope,
            render_width: input.render_width,
            emulation_profile: input.emulation_profile,
            respect_page_css_size: input.respect_page_css_size,
        },
    )?;

    Ok(ExportDocumentPdfResult {
        file: result.file,
        output_dir: result.output_dir,
    })
}

#[tauri::command]
fn export_document_image(
    app: tauri::AppHandle,
    input: ExportDocumentImageInput,
) -> Result<ExportDocumentImageResult, String> {
    let result = export_service::export_document_image_from_app(
        &app,
        export_service::DocumentImageExportRequest {
            html: input.html,
            output_file_path: input.output_file_path,
        },
    )?;

    Ok(ExportDocumentImageResult {
        file: result.file,
        output_dir: result.output_dir,
    })
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("Failed to read file: {error}"))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|error| format!("Failed to write file: {error}"))
}

fn normalize_supported_text_path(path: String) -> Result<String, String> {
    let candidate = PathBuf::from(path);
    if !is_supported_text_file(&candidate) {
        return Err(
            "Only supported text files (.md, .markdown, .html, .htm, .py, .js, .ts, .json) can be opened in MDPad."
                .to_string(),
        );
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
    path: Option<String>,
) -> Result<(), String> {
    let normalized_path = match path {
        Some(raw_path) => Some(normalize_supported_text_path(raw_path)?),
        None => None,
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

    let window = match WebviewWindowBuilder::from_config(app, &window_config)
        .map_err(|error| format!("Failed to prepare window: {error}"))?
        .build()
        .map_err(|error| format!("Failed to build window: {error}"))
    {
        Ok(window) => window,
        Err(error) => {
            let state = app.state::<InitialFileState>();
            if let Ok(mut lock) = state.0.lock() {
                let _ = lock.remove(label.as_str());
            }
            return Err(error);
        }
    };

    // Keep new document windows in the foreground on multi-window desktop flows.
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();

    Ok(())
}

#[tauri::command]
async fn create_document_window(app: tauri::AppHandle, path: Option<String>) -> Result<(), String> {
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
    if !is_supported_text_file(&source_path) {
        return Err(
            "Only supported text files (.md, .markdown, .html, .htm, .py, .js, .ts, .json) can be renamed."
                .to_string(),
        );
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
    let initial_file = extract_supported_text_path(&std::env::args().collect::<Vec<_>>());
    let mut initial_file_map = HashMap::new();
    initial_file_map.insert("main".to_string(), initial_file);

    tauri::Builder::default()
        .manage(InitialFileState(Mutex::new(initial_file_map)))
        .manage(AttachmentLibraryState(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = extract_supported_text_path(&argv) {
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
            save_export_pdf_dialog,
            read_text_file,
            write_text_file,
            rename_file,
            create_document_window,
            pick_attachment_library_dir,
            pick_export_directory,
            get_attachment_library_dir,
            set_attachment_library_dir,
            save_attachment_bytes_to_library,
            export_markdown_pages,
            export_document_pdf,
            export_document_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running MDPad");
}

#[cfg(test)]
mod tests {
    use super::{
        build_export_batch_base_name, build_export_file_name, build_export_page_file_name,
        find_available_export_batch_base_name, sanitize_export_base_name,
    };
    use std::fs;

    #[test]
    fn sanitize_export_base_name_replaces_invalid_characters() {
        assert_eq!(sanitize_export_base_name(" report:Q2* "), "report_Q2_");
        assert_eq!(sanitize_export_base_name("   "), "untitled");
    }

    #[test]
    fn build_export_batch_base_name_adds_selection_suffix() {
        assert_eq!(build_export_batch_base_name("note", "document"), "note");
        assert_eq!(
            build_export_batch_base_name("note", "selection"),
            "note-selection"
        );
    }

    #[test]
    fn build_export_page_file_name_is_zero_padded() {
        assert_eq!(
            build_export_page_file_name("note-selection", "png", 0),
            "note-selection-page-01.png"
        );
        assert_eq!(
            build_export_page_file_name("note-selection", "svg", 11),
            "note-selection-page-12.svg"
        );
    }

    #[test]
    fn find_available_export_batch_base_name_advances_suffix_when_needed() {
        let temp_dir =
            std::env::temp_dir().join(format!("mdpad-export-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();
        fs::write(temp_dir.join("note-page-01.png"), b"one").unwrap();
        fs::write(temp_dir.join("note-page-02.png"), b"two").unwrap();

        let result = find_available_export_batch_base_name(&temp_dir, "note", "png", 2);

        assert_eq!(result, "note-1");
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn build_export_file_name_adds_selection_suffix_for_pdf() {
        assert_eq!(
            build_export_file_name("note", "document", "pdf"),
            "note.pdf"
        );
        assert_eq!(
            build_export_file_name("note", "selection", "pdf"),
            "note-selection.pdf"
        );
    }
}
