import type { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";

export type SlashCommandGroup = "Basic" | "Insert" | "Media" | "Math";

export interface SlashCommandItem {
  id: string;
  group: SlashCommandGroup;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  run: (editor: Editor) => void;
}

export const slashGroupOrder: SlashCommandGroup[] = ["Basic", "Insert", "Media", "Math"];
