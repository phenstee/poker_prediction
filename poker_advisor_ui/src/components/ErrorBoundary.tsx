import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/primitives";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI runtime error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-3 px-6 text-slate-100">
          <h1 className="text-2xl font-bold">Frontend Error</h1>
          <p className="text-sm text-slate-300">The UI crashed. This is local-only and safe. Reload after fixing the error.</p>
          <pre className="w-full overflow-auto rounded-lg border border-rose-400/30 bg-rose-950/30 p-3 text-xs text-rose-200">
            {this.state.message || "Unknown runtime error"}
          </pre>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
