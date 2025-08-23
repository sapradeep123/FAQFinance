"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAdmin = RequireAdmin;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useAuthStore_1 = require("../../stores/useAuthStore");
const use_toast_1 = require("../../hooks/use-toast");
function RequireAdmin({ children }) {
    const { user, isAuthenticated, checkAuth } = (0, useAuthStore_1.useAuthStore)();
    const location = (0, react_router_dom_1.useLocation)();
    const { toast } = (0, use_toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        checkAuth();
    }, []);
    (0, react_1.useEffect)(() => {
        if (isAuthenticated && user && user.role !== 'admin') {
            toast({
                title: 'Access Denied',
                description: 'You do not have permission to access this page.',
                variant: 'destructive'
            });
        }
    }, [isAuthenticated, user, toast]);
    if (!isAuthenticated || !user) {
        return <react_router_dom_1.Navigate to="/auth/login" state={{ from: location }} replace/>;
    }
    if (user.role !== 'admin') {
        return <react_router_dom_1.Navigate to="/app/chat" replace/>;
    }
    return <>{children}</>;
}
//# sourceMappingURL=RequireAdmin.js.map