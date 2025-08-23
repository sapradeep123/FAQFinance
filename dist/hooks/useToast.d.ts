import React from 'react';
interface ToastOptions {
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    dismissible?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
    cancel?: {
        label: string;
        onClick?: () => void;
    };
}
interface LoadingToastOptions extends Omit<ToastOptions, 'duration'> {
    loadingMessage?: string;
}
declare class ToastManager {
    private loadingToasts;
    success(message: string, options?: ToastOptions): any;
    error(message: string, options?: ToastOptions): any;
    warning(message: string, options?: ToastOptions): any;
    info(message: string, options?: ToastOptions): any;
    loading(message: string, options?: LoadingToastOptions): any;
    promise<T>(promise: Promise<T>, messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
    }, options?: LoadingToastOptions): Promise<T>;
    custom(content: React.ReactNode, options?: ToastOptions): any;
    dismiss(toastId?: string | number): void;
    dismissAll(): void;
    update(toastId: string | number, message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;
    saveSuccess(itemName?: string): any;
    saveError(itemName?: string, error?: string): any;
    deleteSuccess(itemName?: string): any;
    deleteError(itemName?: string, error?: string): any;
    uploadSuccess(fileName?: string): any;
    uploadError(fileName?: string, error?: string): any;
    networkError(action?: string): any;
    validationError(field: string, issue: string): any;
    copySuccess(item?: string): any;
    copyError(): any;
}
export declare function useToast(): ToastManager;
export declare const toast: ToastManager;
export type { ToastOptions, LoadingToastOptions };
export default toast;
//# sourceMappingURL=useToast.d.ts.map