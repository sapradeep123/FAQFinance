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
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const button_1 = require("./ui/button");
const useAuthStore_1 = require("../stores/useAuthStore");
const Header = () => {
    const location = (0, react_router_dom_1.useLocation)();
    const { user } = (0, useAuthStore_1.useAuthStore)();
    const [isDark, setIsDark] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);
    }, []);
    const toggleDarkMode = () => {
        const newDarkMode = !isDark;
        setIsDark(newDarkMode);
        if (newDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };
    const getPageTitle = () => {
        switch (location.pathname) {
            case '/app/chat':
                return 'AI Assistant';
            case '/app/portfolio':
                return 'Portfolio';
            case '/app/admin':
                return 'Admin Panel';
            case '/app/settings':
                return 'Settings';
            default:
                return 'Trae Financial AI';
        }
    };
    return (<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {getPageTitle()}
        </h1>
        
        <div className="flex items-center space-x-4">
          
          <button_1.Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9">
            {isDark ? (<lucide_react_1.Sun className="h-4 w-4"/>) : (<lucide_react_1.Moon className="h-4 w-4"/>)}
            <span className="sr-only">Toggle theme</span>
          </button_1.Button>
          
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {user?.name || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>);
};
exports.default = Header;
//# sourceMappingURL=Header.js.map