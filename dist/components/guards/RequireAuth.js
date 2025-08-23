"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireAuth = RequireAuth;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useAuthStore_1 = require("../../stores/useAuthStore");
function RequireAuth({ children }) {
    const { user, isAuthenticated, checkAuth } = (0, useAuthStore_1.useAuthStore)();
    const location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(() => {
        checkAuth();
    }, []);
    if (!isAuthenticated || !user) {
        return <react_router_dom_1.Navigate to="/auth/login" state={{ from: location }} replace/>;
    }
    return <>{children}</>;
}
//# sourceMappingURL=RequireAuth.js.map