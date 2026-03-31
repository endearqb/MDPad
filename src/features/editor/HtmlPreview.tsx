import { useEffect, useMemo, useRef } from "react";
import { openExternalUrl } from "../file/fileService";
import {
  buildControlledHtmlPreviewDocument,
  createHtmlPreviewInstanceToken,
  extractExternalOpenUrlFromPreviewMessage
} from "./htmlPreviewDocument";

interface HtmlPreviewProps {
  html: string;
  documentPath: string | null;
}

export default function HtmlPreview({
  html,
  documentPath
}: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const instanceTokenRef = useRef<string>(createHtmlPreviewInstanceToken());

  const srcDoc = useMemo(() => {
    return buildControlledHtmlPreviewDocument(
      html,
      documentPath,
      instanceTokenRef.current
    );
  }, [documentPath, html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const url = extractExternalOpenUrlFromPreviewMessage(
        event.data,
        instanceTokenRef.current,
        event.source,
        iframeRef.current?.contentWindow ?? null
      );
      if (!url) {
        return;
      }

      void openExternalUrl(url).catch((error) => {
        console.error("Failed to open HTML preview external URL.", error);
      });
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="html-preview-shell">
      <iframe
        ref={iframeRef}
        className="html-preview-frame"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        title="HTML Preview"
      />
    </div>
  );
}
