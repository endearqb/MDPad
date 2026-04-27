export const APP_TOASTER_OVERRIDES = {
  Root: {
    style: {
      zIndex: 1400
    }
  },
  ToastBody: {
    style: {
      borderRadius: "10px",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "var(--toast-glass-border)",
      backgroundColor: "var(--toast-glass-bg)",
      backgroundImage:
        "linear-gradient(135deg, var(--toast-glass-highlight) 0%, transparent 46%)",
      color: "var(--text-primary)",
      boxShadow: "var(--toast-glass-shadow)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      minWidth: "280px",
      maxWidth: "360px",
      maxHeight: "min(60vh, 520px)",
      overflowY: "auto"
    }
  },
  ToastInnerContainer: {
    style: {
      fontSize: "12px",
      fontWeight: 500,
      lineHeight: "1.42",
      overflowWrap: "anywhere",
      paddingTop: "10px",
      paddingBottom: "10px",
      paddingLeft: "12px",
      paddingRight: "12px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word"
    }
  },
  ToastCloseIcon: {
    style: {
      color: "var(--text-secondary)"
    }
  }
} as const;
