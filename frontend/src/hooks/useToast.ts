import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
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

class ToastManager {
  private loadingToasts = new Map<string, string | number>();

  success(message: string, options: ToastOptions = {}) {
    return sonnerToast.success(message, {
      duration: options.duration || 4000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel,
      icon: React.createElement(CheckCircle, { className: 'h-4 w-4' })
    });
  }

  error(message: string, options: ToastOptions = {}) {
    return sonnerToast.error(message, {
      duration: options.duration || 6000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel,
      icon: React.createElement(XCircle, { className: 'h-4 w-4' })
    });
  }

  warning(message: string, options: ToastOptions = {}) {
    return sonnerToast.warning(message, {
      duration: options.duration || 5000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel,
      icon: React.createElement(AlertCircle, { className: 'h-4 w-4' })
    });
  }

  info(message: string, options: ToastOptions = {}) {
    return sonnerToast.info(message, {
      duration: options.duration || 4000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel,
      icon: React.createElement(Info, { className: 'h-4 w-4' })
    });
  }

  loading(message: string, options: LoadingToastOptions = {}) {
    return sonnerToast.loading(message, {
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel,
      icon: React.createElement(Loader2, { className: 'h-4 w-4 animate-spin' })
    });
  }

  // Promise-based toast for async operations
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options: LoadingToastOptions = {}
  ): Promise<T> {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel
    });
  }

  // Custom toast with full control
  custom(content: React.ReactNode, options: ToastOptions = {}) {
    return sonnerToast.custom(content, {
      duration: options.duration || 4000,
      position: options.position,
      dismissible: options.dismissible !== false,
      action: options.action,
      cancel: options.cancel
    });
  }

  // Dismiss specific toast
  dismiss(toastId?: string | number) {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }

  // Dismiss all toasts
  dismissAll() {
    sonnerToast.dismiss();
  }

  // Update existing toast
  update(toastId: string | number, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const icons = {
      success: React.createElement(CheckCircle, { className: 'h-4 w-4' }),
      error: React.createElement(XCircle, { className: 'h-4 w-4' }),
      warning: React.createElement(AlertCircle, { className: 'h-4 w-4' }),
      info: React.createElement(Info, { className: 'h-4 w-4' })
    };

    sonnerToast.success(message, {
      id: toastId,
      icon: icons[type]
    });
  }

  // Utility methods for common scenarios
  saveSuccess(itemName: string = 'Item') {
    return this.success(`${itemName} saved successfully`);
  }

  saveError(itemName: string = 'Item', error?: string) {
    const message = error ? `Failed to save ${itemName.toLowerCase()}: ${error}` : `Failed to save ${itemName.toLowerCase()}`;
    return this.error(message);
  }

  deleteSuccess(itemName: string = 'Item') {
    return this.success(`${itemName} deleted successfully`);
  }

  deleteError(itemName: string = 'Item', error?: string) {
    const message = error ? `Failed to delete ${itemName.toLowerCase()}: ${error}` : `Failed to delete ${itemName.toLowerCase()}`;
    return this.error(message);
  }

  uploadSuccess(fileName?: string) {
    const message = fileName ? `${fileName} uploaded successfully` : 'File uploaded successfully';
    return this.success(message);
  }

  uploadError(fileName?: string, error?: string) {
    const base = fileName ? `Failed to upload ${fileName}` : 'Failed to upload file';
    const message = error ? `${base}: ${error}` : base;
    return this.error(message);
  }

  networkError(action: string = 'complete the request') {
    return this.error(`Network error: Unable to ${action}. Please check your connection and try again.`);
  }

  validationError(field: string, issue: string) {
    return this.warning(`${field}: ${issue}`);
  }

  copySuccess(item: string = 'Text') {
    return this.success(`${item} copied to clipboard`);
  }

  copyError() {
    return this.error('Failed to copy to clipboard');
  }
}

// Create singleton instance
const toastManager = new ToastManager();

// Hook for using toast in components
export function useToast() {
  return toastManager;
}

// Export the toast manager for direct usage
export const toast = toastManager;

// Export types
export type { ToastOptions, LoadingToastOptions };

// Default export
export default toast;