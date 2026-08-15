import { Component, type ErrorInfo, type ReactNode } from "react";
import { signalLazySceneError } from "./lazySceneEvents";

interface Props {
	boundaryId: string;
	children: ReactNode;
}

interface State {
	hasError: boolean;
}

export default class SceneErrorBoundary extends Component<Props, State> {
	public state: State = { hasError: false };

	public static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	public componentDidCatch(error: Error, info: ErrorInfo): void {
		signalLazySceneError(this.props.boundaryId, { error, info });
	}

	public render(): ReactNode {
		return this.state.hasError ? null : this.props.children;
	}
}
