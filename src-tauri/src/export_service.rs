use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::path::BaseDirectory;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone)]
pub struct MarkdownExportRequest {
    pub markdown: String,
    pub output_dir: String,
    pub format: String,
    pub scope: String,
    pub theme: String,
    pub base_name: String,
}

#[derive(Debug, Clone)]
pub struct DocumentPdfExportRequest {
    pub html: String,
    pub output_file_path: String,
    pub scope: String,
    pub render_width: u32,
    pub emulation_profile: String,
    pub respect_page_css_size: bool,
}

#[derive(Debug, Clone)]
pub struct DocumentImageExportRequest {
    pub html: String,
    pub output_file_path: String,
}

#[derive(Debug, Clone)]
pub struct ExportDocBuilderRequest {
    pub kind: String,
    pub input_path: String,
    pub title: String,
    pub render_width: u32,
    pub theme: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub files: Vec<String>,
    pub page_count: usize,
    pub output_dir: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportDocumentPdfResult {
    pub file: String,
    pub output_dir: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportDocumentImageResult {
    pub file: String,
    pub output_dir: String,
}

#[derive(Debug, Serialize)]
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
struct PdfRendererRequest {
    kind: String,
    html_path: String,
    output_path: String,
    viewport_width: u32,
    emulation_profile: String,
    respect_page_css_size: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PdfRendererResult {
    file: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocBuilderRunnerRequest {
    kind: String,
    input_path: String,
    title: String,
    render_width: u32,
    theme: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportDocBuilderResult {
    html: String,
}

struct ExportRuntime {
    node_path: PathBuf,
    working_dir: PathBuf,
    marknative_script_path: PathBuf,
    playwright_script_path: PathBuf,
    export_doc_builder_script_path: PathBuf,
}

enum RuntimeContext<'a> {
    App(&'a tauri::AppHandle),
    Process,
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

fn normalize_runtime_path(path: PathBuf) -> PathBuf {
    PathBuf::from(strip_windows_verbatim_prefix(
        path.to_string_lossy().into_owned(),
    ))
}

fn bundled_runtime_from_root(bundled_root: &Path) -> Option<ExportRuntime> {
    let bundled_node = normalize_runtime_path(bundled_root.join("node-runtime").join("node.exe"));
    let bundled_marknative = normalize_runtime_path(
        bundled_root
            .join("marknative-renderer")
            .join("app")
            .join("renderer.mjs"),
    );
    let bundled_playwright = normalize_runtime_path(
        bundled_root
            .join("playwright-pdf")
            .join("app")
            .join("runner.mjs"),
    );
    let bundled_export_doc_builder = normalize_runtime_path(
        bundled_root
            .join("export-doc-builder")
            .join("app")
            .join("runner.cjs"),
    );

    if bundled_marknative.exists()
        && bundled_playwright.exists()
        && bundled_export_doc_builder.exists()
        && (!cfg!(target_os = "windows") || bundled_node.exists())
    {
        let working_dir = bundled_marknative.parent()?.to_path_buf();
        Some(ExportRuntime {
            node_path: bundled_node,
            working_dir,
            marknative_script_path: bundled_marknative,
            playwright_script_path: bundled_playwright,
            export_doc_builder_script_path: bundled_export_doc_builder,
        })
    } else {
        None
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

fn normalize_pdf_emulation_profile(profile: &str) -> Result<&'static str, String> {
    match profile.trim().to_ascii_lowercase().as_str() {
        "mobile" => Ok("mobile"),
        "tablet" => Ok("tablet"),
        "desktop" => Ok("desktop"),
        "wide" => Ok("wide"),
        "custom" => Ok("custom"),
        _ => Err(
            "PDF emulation profile must be mobile, tablet, desktop, wide, or custom.".to_string(),
        ),
    }
}

pub fn normalize_markdown_theme(theme: &str) -> &'static str {
    match theme.trim() {
        "github" => "github",
        "academic" => "academic",
        "notionish" => "notionish",
        _ => "default",
    }
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

fn build_export_batch_base_name(base_name: &str, scope: &str) -> String {
    if scope == "selection" {
        format!("{base_name}-selection")
    } else {
        base_name.to_string()
    }
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

fn workspace_root() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Failed to resolve workspace root.".to_string())
}

fn resolve_export_runtime(context: RuntimeContext<'_>) -> Result<ExportRuntime, String> {
    match context {
        RuntimeContext::App(app) => {
            let bundled_node = normalize_runtime_path(
                app.path()
                    .resolve("node-runtime/node.exe", BaseDirectory::Resource)
                    .map_err(|error| {
                        format!("Failed to resolve bundled shared runtime: {error}")
                    })?,
            );
            let bundled_marknative = normalize_runtime_path(
                app.path()
                    .resolve(
                        "marknative-renderer/app/renderer.mjs",
                        BaseDirectory::Resource,
                    )
                    .map_err(|error| {
                        format!("Failed to resolve bundled markdown renderer: {error}")
                    })?,
            );
            let bundled_playwright = normalize_runtime_path(
                app.path()
                    .resolve("playwright-pdf/app/runner.mjs", BaseDirectory::Resource)
                    .map_err(|error| format!("Failed to resolve bundled PDF renderer: {error}"))?,
            );
            let bundled_export_doc_builder = normalize_runtime_path(
                app.path()
                    .resolve("export-doc-builder/app/runner.mjs", BaseDirectory::Resource)
                    .map_err(|error| {
                        format!("Failed to resolve bundled export doc builder: {error}")
                    })?,
            );

            if bundled_marknative.exists()
                && bundled_playwright.exists()
                && bundled_export_doc_builder.exists()
                && (!cfg!(target_os = "windows") || bundled_node.exists())
            {
                let working_dir = bundled_marknative
                    .parent()
                    .ok_or_else(|| "Bundled renderer script directory is invalid.".to_string())?
                    .to_path_buf();
                return Ok(ExportRuntime {
                    node_path: bundled_node,
                    working_dir,
                    marknative_script_path: bundled_marknative,
                    playwright_script_path: bundled_playwright,
                    export_doc_builder_script_path: bundled_export_doc_builder,
                });
            }

            resolve_export_runtime(RuntimeContext::Process)
        }
        RuntimeContext::Process => {
            let current_exe = std::env::current_exe()
                .map_err(|error| format!("Failed to resolve current executable path: {error}"))?;
            let executable_dir = normalize_runtime_path(
                current_exe
                    .parent()
                    .ok_or_else(|| "Current executable path is invalid.".to_string())?
                    .to_path_buf(),
            );

            for bundled_root in [executable_dir.clone(), executable_dir.join("resources")] {
                if let Some(runtime) = bundled_runtime_from_root(&bundled_root) {
                    return Ok(runtime);
                }
            }

            let workspace_root = workspace_root()?;
            let dev_marknative = workspace_root
                .join("scripts")
                .join("marknative-renderer-src")
                .join("runner.mjs");
            let dev_playwright = workspace_root
                .join("scripts")
                .join("playwright-pdf-src")
                .join("runner.mjs");
            let dev_export_doc_builder = workspace_root
                .join("scripts")
                .join("export-doc-builder-src")
                .join("runner.mjs");
            if !dev_marknative.exists()
                || !dev_playwright.exists()
                || !dev_export_doc_builder.exists()
            {
                return Err("Export worker scripts were not found.".to_string());
            }

            Ok(ExportRuntime {
                node_path: PathBuf::from("node"),
                working_dir: workspace_root,
                marknative_script_path: dev_marknative,
                playwright_script_path: dev_playwright,
                export_doc_builder_script_path: dev_export_doc_builder,
            })
        }
    }
}

#[cfg(target_os = "windows")]
fn configure_hidden_child_window(command: &mut Command) {
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn configure_hidden_child_window(_command: &mut Command) {}

fn run_node_json<Req, Res>(
    runtime: &ExportRuntime,
    script_path: &Path,
    request: &Req,
    hidden_window: bool,
    failure_label: &str,
) -> Result<Res, String>
where
    Req: Serialize,
    Res: for<'de> Deserialize<'de>,
{
    let request_json = serde_json::to_vec(request)
        .map_err(|error| format!("Failed to encode {failure_label} request: {error}"))?;

    let mut command = Command::new(&runtime.node_path);
    command
        .arg(script_path)
        .current_dir(&runtime.working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if hidden_window {
        configure_hidden_child_window(&mut command);
    }

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Failed to start {failure_label}. Rebuild MDPad or install Node.js for development. {error}"
        )
    })?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(&request_json)
            .map_err(|error| format!("Failed to send {failure_label} request: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Failed to wait for {failure_label}: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let detail = if stderr.is_empty() {
            format!("{failure_label} exited with a non-zero status.")
        } else {
            stderr
        };
        return Err(detail);
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Failed to decode {failure_label} response: {error}"))
}

fn run_markdown_renderer(
    runtime: &ExportRuntime,
    request: &RendererRequest,
) -> Result<RendererResult, String> {
    run_node_json(
        runtime,
        &runtime.marknative_script_path,
        request,
        true,
        "markdown renderer",
    )
}

fn run_pdf_renderer(
    runtime: &ExportRuntime,
    request: &PdfRendererRequest,
) -> Result<PdfRendererResult, String> {
    run_node_json(
        runtime,
        &runtime.playwright_script_path,
        request,
        true,
        "PDF renderer",
    )
}

pub fn build_pdf_export_html_for_cli(request: ExportDocBuilderRequest) -> Result<String, String> {
    let runtime = resolve_export_runtime(RuntimeContext::Process)?;
    let result: ExportDocBuilderResult = run_node_json(
        &runtime,
        &runtime.export_doc_builder_script_path,
        &ExportDocBuilderRunnerRequest {
            kind: request.kind,
            input_path: request.input_path,
            title: request.title,
            render_width: request.render_width,
            theme: request.theme,
        },
        false,
        "export doc builder",
    )?;
    if result.html.trim().is_empty() {
        return Err("Export doc builder returned an empty HTML document.".to_string());
    }
    Ok(result.html)
}

fn export_markdown_pages_inner(
    runtime: &ExportRuntime,
    input: MarkdownExportRequest,
) -> Result<ExportResult, String> {
    let markdown = input.markdown.trim().to_string();
    if markdown.is_empty() {
        return Err("Markdown content cannot be empty.".to_string());
    }

    let format = normalize_image_export_format(&input.format)?;
    let scope = normalize_export_scope(&input.scope)?;
    let theme = normalize_markdown_theme(&input.theme);
    let base_name = sanitize_export_base_name(&input.base_name);

    let output_dir = PathBuf::from(input.output_dir.trim());
    if output_dir.as_os_str().is_empty() {
        return Err("Output directory cannot be empty.".to_string());
    }
    if output_dir.exists() {
        if !output_dir.is_dir() {
            return Err("Output directory must be a folder.".to_string());
        }
    } else {
        fs::create_dir_all(&output_dir)
            .map_err(|error| format!("Failed to create export directory: {error}"))?;
    }

    let temp_dir = create_temp_export_directory()?;
    let renderer_result = match run_markdown_renderer(
        runtime,
        &RendererRequest {
            markdown,
            temp_dir: normalize_runtime_path(temp_dir.clone())
                .to_string_lossy()
                .into_owned(),
            format: format.to_string(),
            theme: theme.to_string(),
        },
    ) {
        Ok(result) => result,
        Err(error) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Markdown export failed: {error}"));
        }
    };

    if renderer_result.page_count == 0 || renderer_result.files.is_empty() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Markdown renderer returned no pages.".to_string());
    }
    if renderer_result.page_count != renderer_result.files.len() {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Markdown renderer returned an invalid page manifest.".to_string());
    }
    if renderer_result.format != format {
        let _ = fs::remove_dir_all(&temp_dir);
        return Err("Markdown renderer returned an unexpected format.".to_string());
    }

    let files_result = move_renderer_outputs(
        &renderer_result.files,
        &output_dir,
        &base_name,
        format,
        scope,
    );
    let _ = fs::remove_dir_all(&temp_dir);
    let files = files_result?;

    Ok(ExportResult {
        page_count: files.len(),
        files,
        output_dir: normalize_path(output_dir),
    })
}

fn export_document_pdf_inner(
    runtime: &ExportRuntime,
    input: DocumentPdfExportRequest,
) -> Result<ExportDocumentPdfResult, String> {
    let html = input.html.trim().to_string();
    if html.is_empty() {
        return Err("HTML content cannot be empty.".to_string());
    }

    let _scope = normalize_export_scope(&input.scope)?;
    let emulation_profile = normalize_pdf_emulation_profile(&input.emulation_profile)?;
    if input.render_width < 240 || input.render_width > 3840 {
        return Err("PDF render width must be between 240 and 3840 px.".to_string());
    }

    let output_path = PathBuf::from(input.output_file_path.trim());
    if output_path.as_os_str().is_empty() {
        return Err("Output file path cannot be empty.".to_string());
    }
    let output_dir = output_path
        .parent()
        .ok_or_else(|| "Output file path must include a parent directory.".to_string())?
        .to_path_buf();
    if output_dir.exists() {
        if !output_dir.is_dir() {
            return Err("Output directory must be a folder.".to_string());
        }
    } else {
        fs::create_dir_all(&output_dir)
            .map_err(|error| format!("Failed to create export directory: {error}"))?;
    }

    let temp_dir = create_temp_directory("mdpad-playwright-pdf")?;
    let html_path = temp_dir.join("export.html");
    fs::write(&html_path, html)
        .map_err(|error| format!("Failed to write PDF export document: {error}"))?;

    let pdf_result = match run_pdf_renderer(
        runtime,
        &PdfRendererRequest {
            kind: "pdf".to_string(),
            html_path: normalize_runtime_path(html_path.clone())
                .to_string_lossy()
                .into_owned(),
            output_path: normalize_runtime_path(output_path.clone())
                .to_string_lossy()
                .into_owned(),
            viewport_width: input.render_width,
            emulation_profile: emulation_profile.to_string(),
            respect_page_css_size: input.respect_page_css_size,
        },
    ) {
        Ok(result) => result,
        Err(error) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("PDF export failed: {error}"));
        }
    };

    let _ = fs::remove_dir_all(&temp_dir);

    let rendered_path = PathBuf::from(pdf_result.file);
    if !rendered_path.exists() {
        return Err("PDF renderer did not produce an output file.".to_string());
    }

    Ok(ExportDocumentPdfResult {
        file: normalize_path(rendered_path),
        output_dir: normalize_path(output_dir),
    })
}

fn export_document_image_inner(
    runtime: &ExportRuntime,
    input: DocumentImageExportRequest,
) -> Result<ExportDocumentImageResult, String> {
    let html = input.html.trim().to_string();
    if html.is_empty() {
        return Err("HTML content cannot be empty.".to_string());
    }

    let output_path = PathBuf::from(input.output_file_path.trim());
    if output_path.as_os_str().is_empty() {
        return Err("Output file path cannot be empty.".to_string());
    }
    let output_dir = output_path
        .parent()
        .ok_or_else(|| "Output file path must include a parent directory.".to_string())?
        .to_path_buf();
    if output_dir.exists() {
        if !output_dir.is_dir() {
            return Err("Output directory must be a folder.".to_string());
        }
    } else {
        fs::create_dir_all(&output_dir)
            .map_err(|error| format!("Failed to create export directory: {error}"))?;
    }

    let temp_dir = create_temp_directory("mdpad-playwright-image")?;
    let html_path = temp_dir.join("export.html");
    fs::write(&html_path, html)
        .map_err(|error| format!("Failed to write image export document: {error}"))?;

    let image_result = match run_pdf_renderer(
        runtime,
        &PdfRendererRequest {
            kind: "png".to_string(),
            html_path: normalize_runtime_path(html_path.clone())
                .to_string_lossy()
                .into_owned(),
            output_path: normalize_runtime_path(output_path.clone())
                .to_string_lossy()
                .into_owned(),
            viewport_width: 1280,
            emulation_profile: "desktop".to_string(),
            respect_page_css_size: false,
        },
    ) {
        Ok(result) => result,
        Err(error) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(format!("Image export failed: {error}"));
        }
    };

    let _ = fs::remove_dir_all(&temp_dir);

    let rendered_path = PathBuf::from(image_result.file);
    if !rendered_path.exists() {
        return Err("Image renderer did not produce an output file.".to_string());
    }

    Ok(ExportDocumentImageResult {
        file: normalize_path(rendered_path),
        output_dir: normalize_path(output_dir),
    })
}

pub fn export_markdown_pages_from_app(
    app: &tauri::AppHandle,
    input: MarkdownExportRequest,
) -> Result<ExportResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::App(app))?;
    export_markdown_pages_inner(&runtime, input)
}

pub fn export_markdown_pages_for_cli(input: MarkdownExportRequest) -> Result<ExportResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::Process)?;
    export_markdown_pages_inner(&runtime, input)
}

pub fn export_document_pdf_from_app(
    app: &tauri::AppHandle,
    input: DocumentPdfExportRequest,
) -> Result<ExportDocumentPdfResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::App(app))?;
    export_document_pdf_inner(&runtime, input)
}

pub fn export_document_pdf_for_cli(
    input: DocumentPdfExportRequest,
) -> Result<ExportDocumentPdfResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::Process)?;
    export_document_pdf_inner(&runtime, input)
}

pub fn export_document_image_from_app(
    app: &tauri::AppHandle,
    input: DocumentImageExportRequest,
) -> Result<ExportDocumentImageResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::App(app))?;
    export_document_image_inner(&runtime, input)
}

pub fn export_document_image_for_cli(
    input: DocumentImageExportRequest,
) -> Result<ExportDocumentImageResult, String> {
    let runtime = resolve_export_runtime(RuntimeContext::Process)?;
    export_document_image_inner(&runtime, input)
}

#[cfg(test)]
mod tests {
    use super::{
        bundled_runtime_from_root, normalize_pdf_emulation_profile, normalize_runtime_path,
    };
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[cfg(target_os = "windows")]
    #[test]
    fn normalize_runtime_path_strips_windows_verbatim_disk_prefix() {
        let normalized = normalize_runtime_path(PathBuf::from(
            r"\\?\C:\Users\endea\AppData\Local\MDPad\playwright-pdf\app\runner.mjs",
        ));

        assert_eq!(
            normalized,
            PathBuf::from(r"C:\Users\endea\AppData\Local\MDPad\playwright-pdf\app\runner.mjs")
        );
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn normalize_runtime_path_strips_windows_verbatim_unc_prefix() {
        let normalized = normalize_runtime_path(PathBuf::from(
            r"\\?\UNC\server\share\playwright-pdf\app\runner.mjs",
        ));

        assert_eq!(
            normalized,
            PathBuf::from(r"\\server\share\playwright-pdf\app\runner.mjs")
        );
    }

    #[test]
    fn bundled_runtime_from_root_accepts_flat_install_layout() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let root = std::env::temp_dir().join(format!("mdpad-bundled-runtime-test-{suffix}"));

        fs::create_dir_all(root.join("node-runtime")).unwrap();
        fs::create_dir_all(root.join("marknative-renderer").join("app")).unwrap();
        fs::create_dir_all(root.join("playwright-pdf").join("app")).unwrap();
        fs::create_dir_all(root.join("export-doc-builder").join("app")).unwrap();
        fs::write(root.join("node-runtime").join("node.exe"), []).unwrap();
        fs::write(
            root.join("marknative-renderer")
                .join("app")
                .join("renderer.mjs"),
            [],
        )
        .unwrap();
        fs::write(
            root.join("playwright-pdf").join("app").join("runner.mjs"),
            [],
        )
        .unwrap();
        fs::write(
            root.join("export-doc-builder")
                .join("app")
                .join("runner.cjs"),
            [],
        )
        .unwrap();

        let runtime = bundled_runtime_from_root(&root);
        let _ = fs::remove_dir_all(&root);

        assert!(runtime.is_some());
    }

    #[test]
    fn normalize_pdf_emulation_profile_accepts_known_values() {
        assert_eq!(normalize_pdf_emulation_profile("mobile").unwrap(), "mobile");
        assert_eq!(normalize_pdf_emulation_profile("tablet").unwrap(), "tablet");
        assert_eq!(
            normalize_pdf_emulation_profile("desktop").unwrap(),
            "desktop"
        );
        assert_eq!(normalize_pdf_emulation_profile("wide").unwrap(), "wide");
        assert_eq!(normalize_pdf_emulation_profile("custom").unwrap(), "custom");
    }
}
