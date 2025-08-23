import React, { Component, ErrorInfo, ReactNode } from 'react';
interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}
declare class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    handleReload: () => void;
    handleGoHome: () => void;
    handleRetry: () => void;
    render(): any;
}
export default ErrorBoundary;
export declare function useErrorHandler(): (error: Error, errorInfo?: ErrorInfo) => void;
export declare function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<Props, 'children'>): {
    (props: P): any;
    displayName: string;
};
//# sourceMappingURL=ErrorBoundary.d.ts.map