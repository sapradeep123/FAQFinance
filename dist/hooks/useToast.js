"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toast = void 0;
exports.useToast = useToast;
const sonner_1 = require("sonner");
const lucide_react_1 = require("lucide-react");
const react_1 = __importDefault(require("react"));
class ToastManager {
    constructor() {
        this.loadingToasts = new Map();
    }
    success(message, options = {}) {
        return sonner_1.toast.success(message, {
            duration: options.duration || 4000,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel,
            icon: react_1.default.createElement(lucide_react_1.CheckCircle, { className: 'h-4 w-4' })
        });
    }
    error(message, options = {}) {
        return sonner_1.toast.error(message, {
            duration: options.duration || 6000,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel,
            icon: react_1.default.createElement(lucide_react_1.XCircle, { className: 'h-4 w-4' })
        });
    }
    warning(message, options = {}) {
        return sonner_1.toast.warning(message, {
            duration: options.duration || 5000,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel,
            icon: react_1.default.createElement(lucide_react_1.AlertCircle, { className: 'h-4 w-4' })
        });
    }
    info(message, options = {}) {
        return sonner_1.toast.info(message, {
            duration: options.duration || 4000,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel,
            icon: react_1.default.createElement(lucide_react_1.Info, { className: 'h-4 w-4' })
        });
    }
    loading(message, options = {}) {
        return sonner_1.toast.loading(message, {
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel,
            icon: react_1.default.createElement(lucide_react_1.Loader2, { className: 'h-4 w-4 animate-spin' })
        });
    }
    async promise(promise, messages, options = {}) {
        return sonner_1.toast.promise(promise, {
            loading: messages.loading,
            success: messages.success,
            error: messages.error,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel
        });
    }
    custom(content, options = {}) {
        return sonner_1.toast.custom(content, {
            duration: options.duration || 4000,
            position: options.position,
            dismissible: options.dismissible !== false,
            action: options.action,
            cancel: options.cancel
        });
    }
    dismiss(toastId) {
        if (toastId) {
            sonner_1.toast.dismiss(toastId);
        }
        else {
            sonner_1.toast.dismiss();
        }
    }
    dismissAll() {
        sonner_1.toast.dismiss();
    }
    update(toastId, message, type = 'info') {
        const icons = {
            success: react_1.default.createElement(lucide_react_1.CheckCircle, { className: 'h-4 w-4' }),
            error: react_1.default.createElement(lucide_react_1.XCircle, { className: 'h-4 w-4' }),
            warning: react_1.default.createElement(lucide_react_1.AlertCircle, { className: 'h-4 w-4' }),
            info: react_1.default.createElement(lucide_react_1.Info, { className: 'h-4 w-4' })
        };
        sonner_1.toast.success(message, {
            id: toastId,
            icon: icons[type]
        });
    }
    saveSuccess(itemName = 'Item') {
        return this.success(`${itemName} saved successfully`);
    }
    saveError(itemName = 'Item', error) {
        const message = error ? `Failed to save ${itemName.toLowerCase()}: ${error}` : `Failed to save ${itemName.toLowerCase()}`;
        return this.error(message);
    }
    deleteSuccess(itemName = 'Item') {
        return this.success(`${itemName} deleted successfully`);
    }
    deleteError(itemName = 'Item', error) {
        const message = error ? `Failed to delete ${itemName.toLowerCase()}: ${error}` : `Failed to delete ${itemName.toLowerCase()}`;
        return this.error(message);
    }
    uploadSuccess(fileName) {
        const message = fileName ? `${fileName} uploaded successfully` : 'File uploaded successfully';
        return this.success(message);
    }
    uploadError(fileName, error) {
        const base = fileName ? `Failed to upload ${fileName}` : 'Failed to upload file';
        const message = error ? `${base}: ${error}` : base;
        return this.error(message);
    }
    networkError(action = 'complete the request') {
        return this.error(`Network error: Unable to ${action}. Please check your connection and try again.`);
    }
    validationError(field, issue) {
        return this.warning(`${field}: ${issue}`);
    }
    copySuccess(item = 'Text') {
        return this.success(`${item} copied to clipboard`);
    }
    copyError() {
        return this.error('Failed to copy to clipboard');
    }
}
const toastManager = new ToastManager();
function useToast() {
    return toastManager;
}
exports.toast = toastManager;
exports.default = exports.toast;
//# sourceMappingURL=useToast.js.map