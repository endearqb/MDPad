import React, { type ReactNode, useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider as StyletronProvider } from "styletron-react";
import { Client as Styletron } from "styletron-engine-atomic";
import App from "./App";
import "./styles.css";

const engine = new Styletron();
const RootMode = import.meta.env.DEV ? React.Fragment : React.StrictMode;

function formatRuntimeError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message || reason.name;
  }
  if (typeof reason === "string" && reason.trim() !== "") {
    return reason;
  }
  return "Unknown startup error.";
}

function FatalStartupScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#f5f5f5",
        color: "#1f2937",
        fontFamily: "\"IBM Plex Sans\", \"Segoe UI\", sans-serif",
        padding: "24px"
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          border: "1px solid #d1d5db",
          borderRadius: "12px",
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
          padding: "16px 18px"
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "16px",
            lineHeight: 1.35,
            fontWeight: 700
          }}
        >
          MDPad startup failed
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: 1.45,
            color: "#374151"
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

type AppErrorBoundaryProps = {
  children: ReactNode;
  onFatal: (reason: unknown) => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onFatal(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function BootstrapRoot() {
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);

  const reportFatal = useCallback((reason: unknown) => {
    const nextMessage = formatRuntimeError(reason);
    setFatalMessage((current) => current ?? nextMessage);
  }, []);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      reportFatal(event.error ?? event.message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportFatal(event.reason);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [reportFatal]);

  if (fatalMessage) {
    return <FatalStartupScreen message={fatalMessage} />;
  }

  return (
    <RootMode>
      <StyletronProvider value={engine}>
        <AppErrorBoundary onFatal={reportFatal}>
          <App />
        </AppErrorBoundary>
      </StyletronProvider>
    </RootMode>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("MDPad root container (#root) was not found.");
}

ReactDOM.createRoot(rootElement).render(<BootstrapRoot />);
