use mdpad_lib::export_service::{
    build_pdf_export_html_for_cli, export_document_image_for_cli, export_document_pdf_for_cli,
    export_markdown_pages_for_cli, DocumentImageExportRequest, DocumentPdfExportRequest,
    ExportDocBuilderRequest, MarkdownExportRequest,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

fn print_help() {
    println!(
        "\
mdpad-cli export pdf --input <file> --output <file> [--render-width <px>] [--theme <theme>]
mdpad-cli export png --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]
mdpad-cli export svg --input <file> --output-dir <dir> [--base-name <name>] [--scope <scope>] [--theme <theme>]

Supported input types:
  Markdown: .md, .markdown
  HTML: .html, .htm

Options:
  --render-width  PDF render width in px. Default: 1280
  --theme         Markdown export theme. One of: default, github, notionish, academic
  --scope         document or selection. Default: document
"
    );
}

fn parse_args(args: &[String]) -> Result<(String, HashMap<String, String>), String> {
    if args.len() < 2 || args[0] != "export" {
        return Err("Usage: mdpad-cli export <pdf|png|svg> ...".to_string());
    }

    let format = args[1].to_ascii_lowercase();
    let mut options = HashMap::new();
    let mut index = 2;
    while index < args.len() {
        let key = args[index].clone();
        if key == "--help" || key == "-h" {
            return Err(String::new());
        }
        if !key.starts_with("--") {
            return Err(format!("Unexpected argument: {key}"));
        }
        let value = args
            .get(index + 1)
            .ok_or_else(|| format!("Missing value for {key}"))?
            .clone();
        options.insert(key, value);
        index += 2;
    }

    Ok((format, options))
}

fn require_option(options: &HashMap<String, String>, key: &str) -> Result<String, String> {
    options
        .get(key)
        .cloned()
        .ok_or_else(|| format!("Missing required option: {key}"))
}

fn parse_render_width(options: &HashMap<String, String>) -> Result<u32, String> {
    match options.get("--render-width") {
        Some(value) => {
            let parsed = value
                .parse::<u32>()
                .map_err(|_| "--render-width must be an integer.".to_string())?;
            if parsed < 240 || parsed > 3840 {
                return Err("--render-width must be between 240 and 3840.".to_string());
            }
            Ok(parsed)
        }
        None => Ok(1280),
    }
}

fn input_kind(path: &Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
        .as_deref()
    {
        Some("md") | Some("markdown") => Ok("markdown"),
        Some("html") | Some("htm") => Ok("html"),
        _ => Err("Only .md, .markdown, .html, and .htm inputs are supported.".to_string()),
    }
}

fn default_base_name(path: &Path) -> String {
    path.file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("untitled")
        .to_string()
}

fn scope_value(options: &HashMap<String, String>) -> String {
    options
        .get("--scope")
        .cloned()
        .unwrap_or_else(|| "document".to_string())
}

fn theme_value(options: &HashMap<String, String>) -> String {
    options
        .get("--theme")
        .cloned()
        .unwrap_or_else(|| "default".to_string())
}

fn absolutize_cli_path(path: PathBuf) -> Result<PathBuf, String> {
    if path.as_os_str().is_empty() {
        return Err("CLI path cannot be empty.".to_string());
    }

    if path.is_absolute() {
        return Ok(path);
    }

    std::env::current_dir()
        .map(|current_dir| current_dir.join(path))
        .map_err(|error| format!("Failed to read current working directory: {error}"))
}

fn build_first_page_file_name(base_name: &str, scope: &str) -> String {
    if scope == "selection" {
        format!("{base_name}-selection-page-01.png")
    } else {
        format!("{base_name}-page-01.png")
    }
}

fn print_json(value: &serde_json::Value) {
    println!(
        "{}",
        serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
    );
}

fn read_input_file(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|error| format!("Failed to read input file {}: {error}", path.display()))
}

fn run() -> Result<(), String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        print_help();
        return Err("Missing command.".to_string());
    }
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        print_help();
        return Ok(());
    }

    let (format, options) = match parse_args(&args) {
        Ok(result) => result,
        Err(error) if error.is_empty() => {
            print_help();
            return Ok(());
        }
        Err(error) => return Err(error),
    };

    let input = absolutize_cli_path(PathBuf::from(require_option(&options, "--input")?))?;
    let kind = input_kind(&input)?;

    let result = match format.as_str() {
        "pdf" => {
            let output_file_path = absolutize_cli_path(PathBuf::from(require_option(
                &options,
                "--output",
            )?))?;
            let render_width = parse_render_width(&options)?;
            let html = build_pdf_export_html_for_cli(ExportDocBuilderRequest {
                kind: kind.to_string(),
                input_path: input.to_string_lossy().into_owned(),
                title: default_base_name(&input),
                render_width,
                theme: if kind == "markdown" {
                    Some(theme_value(&options))
                } else {
                    None
                },
            })?;

            export_document_pdf_for_cli(DocumentPdfExportRequest {
                html,
                output_file_path: output_file_path.to_string_lossy().into_owned(),
                scope: if kind == "markdown" {
                    scope_value(&options)
                } else {
                    "document".to_string()
                },
                render_width,
                emulation_profile: "custom".to_string(),
                respect_page_css_size: false,
            })
            .map(|result| {
                print_json(&serde_json::json!({
                    "file": result.file,
                    "outputDir": result.output_dir
                }));
            })
        }
        "png" => {
            let output_dir = absolutize_cli_path(PathBuf::from(require_option(
                &options,
                "--output-dir",
            )?))?;
            if kind == "markdown" {
                export_markdown_pages_for_cli(MarkdownExportRequest {
                    markdown: read_input_file(&input)?,
                    output_dir: output_dir.to_string_lossy().into_owned(),
                    format: "png".to_string(),
                    scope: scope_value(&options),
                    theme: theme_value(&options),
                    base_name: options
                        .get("--base-name")
                        .cloned()
                        .unwrap_or_else(|| default_base_name(&input)),
                })
                .map(|result| {
                    print_json(&serde_json::json!({
                        "files": result.files,
                        "pageCount": result.page_count,
                        "outputDir": result.output_dir
                    }));
                })
            } else {
                let render_width = parse_render_width(&options)?;
                let base_name = options
                    .get("--base-name")
                    .cloned()
                    .unwrap_or_else(|| default_base_name(&input));
                let html = build_pdf_export_html_for_cli(ExportDocBuilderRequest {
                    kind: "html".to_string(),
                    input_path: input.to_string_lossy().into_owned(),
                    title: base_name.clone(),
                    render_width,
                    theme: None,
                })?;
                let output_file_path =
                    output_dir.join(build_first_page_file_name(&base_name, "document"));
                export_document_image_for_cli(DocumentImageExportRequest {
                    html,
                    output_file_path: output_file_path.to_string_lossy().into_owned(),
                })
                .map(|result| {
                    print_json(&serde_json::json!({
                        "file": result.file,
                        "outputDir": result.output_dir
                    }));
                })
            }
        }
        "svg" => {
            if kind != "markdown" {
                Err("HTML input only supports PDF and PNG export.".to_string())
            } else {
                let output_dir = absolutize_cli_path(PathBuf::from(require_option(
                    &options,
                    "--output-dir",
                )?))?;
                export_markdown_pages_for_cli(MarkdownExportRequest {
                    markdown: read_input_file(&input)?,
                    output_dir: output_dir.to_string_lossy().into_owned(),
                    format: "svg".to_string(),
                    scope: scope_value(&options),
                    theme: theme_value(&options),
                    base_name: options
                        .get("--base-name")
                        .cloned()
                        .unwrap_or_else(|| default_base_name(&input)),
                })
                .map(|result| {
                    print_json(&serde_json::json!({
                        "files": result.files,
                        "pageCount": result.page_count,
                        "outputDir": result.output_dir
                    }));
                })
            }
        }
        _ => Err("Format must be one of: pdf, png, svg.".to_string()),
    };

    result
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        print_help();
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::absolutize_cli_path;
    use std::path::PathBuf;

    #[test]
    fn absolutize_cli_path_keeps_absolute_paths() {
        let absolute = if cfg!(windows) {
            PathBuf::from(r"C:\temp\example.md")
        } else {
            PathBuf::from("/tmp/example.md")
        };

        assert_eq!(absolutize_cli_path(absolute.clone()).unwrap(), absolute);
    }

    #[test]
    fn absolutize_cli_path_resolves_relative_paths_against_current_directory() {
        let current_dir = std::env::current_dir().unwrap();
        let resolved = absolutize_cli_path(PathBuf::from("report.html")).unwrap();

        assert_eq!(resolved, current_dir.join("report.html"));
    }
}
