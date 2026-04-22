import type { CSSProperties } from "react";

interface HtmlSelectionOverlayProps {
  rect: { left: number; top: number; width: number; height: number } | null;
}

export default function HtmlSelectionOverlay({ rect }: HtmlSelectionOverlayProps) {
  if (!rect) {
    return null;
  }

  const style: CSSProperties = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };

  return <div className="html-preview-selection-overlay" style={style} />;
}
