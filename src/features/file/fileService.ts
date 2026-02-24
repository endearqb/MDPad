import { invoke } from "@tauri-apps/api/core";

export async function getInitialFile(): Promise<string | null> {
  return invoke<string | null>("get_initial_file");
}

export async function openFileDialog(): Promise<string | null> {
  return invoke<string | null>("open_file_dialog");
}

export async function saveFileAsDialog(
  defaultName: string
): Promise<string | null> {
  return invoke<string | null>("save_file_as_dialog", {
    default_name: defaultName
  });
}

export async function readTextFile(path: string): Promise<string> {
  return invoke<string>("read_text_file", { path });
}

export async function writeTextFile(
  path: string,
  content: string
): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}

export async function renameFile(
  path: string,
  newBaseName: string
): Promise<string> {
  return invoke<string>("rename_file", {
    path,
    new_base_name: newBaseName
  });
}

export async function focusMainWindow(): Promise<void> {
  return invoke<void>("focus_main_window");
}
