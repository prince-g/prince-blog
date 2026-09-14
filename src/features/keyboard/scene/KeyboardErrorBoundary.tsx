import { Component, type ErrorInfo, type ReactNode } from "react";
import { KeyboardHeroState } from "./KeyboardHero";

type KeyboardErrorBoundaryProps = Readonly<{
  children: ReactNode;
  onError?: (cause: unknown) => void;
  onRetry: () => void;
}>;

type KeyboardErrorBoundaryState = Readonly<{ failed: boolean }>;

export class KeyboardErrorBoundary extends Component<
  KeyboardErrorBoundaryProps,
  KeyboardErrorBoundaryState
> {
  state: KeyboardErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): KeyboardErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Failed to render the Keychron K2 HE scene.", error, info);
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.failed
      ? <KeyboardHeroState state="error" onRetry={this.props.onRetry} />
      : this.props.children;
  }
}
