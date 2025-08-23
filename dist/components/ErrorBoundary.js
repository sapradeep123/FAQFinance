"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useErrorHandler = useErrorHandler;
exports.withErrorBoundary = withErrorBoundary;
const react_1 = __importStar(require("react"));
const card_1 = require("./ui/card");
const button_1 = require("./ui/button");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
class ErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.handleReload = () => {
            window.location.reload();
        };
        this.handleGoHome = () => {
            window.location.href = '/';
        };
        this.handleRetry = () => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null
            });
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
        sonner_1.toast.error('An unexpected error occurred');
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <card_1.Card className="w-full max-w-2xl">
            <card_1.CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <lucide_react_1.AlertTriangle className="h-8 w-8 text-red-600"/>
              </div>
              <card_1.CardTitle className="text-2xl font-bold text-red-600">
                Oops! Something went wrong
              </card_1.CardTitle>
              <p className="text-muted-foreground mt-2">
                We encountered an unexpected error. Don't worry, we're working to fix it.
              </p>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-6">
              
              {process.env.NODE_ENV === 'development' && this.state.error && (<div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <lucide_react_1.Bug className="h-4 w-4"/>
                      Error Details (Development)
                    </h4>
                    <div className="text-sm text-red-700 space-y-2">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                      {this.state.errorInfo && (<div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>)}
                    </div>
                  </div>
                </div>)}

              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button_1.Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <lucide_react_1.RefreshCw className="h-4 w-4"/>
                  Try Again
                </button_1.Button>
                <button_1.Button variant="outline" onClick={this.handleReload} className="flex items-center gap-2">
                  <lucide_react_1.RefreshCw className="h-4 w-4"/>
                  Reload Page
                </button_1.Button>
                <button_1.Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <lucide_react_1.Home className="h-4 w-4"/>
                  Go Home
                </button_1.Button>
              </div>

              
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please contact support or try refreshing the page.
                </p>
                <p className="mt-1">
                  Error ID: {Date.now().toString(36)}
                </p>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>);
        }
        return this.props.children;
    }
}
exports.default = ErrorBoundary;
function useErrorHandler() {
    return (error, errorInfo) => {
        console.error('Error caught by useErrorHandler:', error, errorInfo);
        sonner_1.toast.error('An error occurred: ' + error.message);
    };
}
function withErrorBoundary(Component, errorBoundaryProps) {
    const WrappedComponent = (props) => (<ErrorBoundary {...errorBoundaryProps}>
      <Component {...props}/>
    </ErrorBoundary>);
    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
    return WrappedComponent;
}
//# sourceMappingURL=ErrorBoundary.js.map