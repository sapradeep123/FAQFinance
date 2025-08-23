"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const sonner_1 = require("sonner");
const AppShell_1 = require("./layouts/AppShell");
const Login_1 = require("./routes/auth/Login");
const Signup_1 = require("./routes/auth/Signup");
const Profile_1 = require("./routes/auth/Profile");
const Chat_1 = require("./routes/app/Chat");
const Portfolio_1 = require("./routes/app/Portfolio");
const Admin_1 = require("./routes/app/Admin");
const Settings_1 = require("./routes/app/Settings");
const RequireAuth_1 = require("./components/guards/RequireAuth");
const RequireAdmin_1 = require("./components/guards/RequireAdmin");
const ErrorBoundary_1 = require("./components/ErrorBoundary");
const NotFound_1 = require("./pages/NotFound");
const useKeyboardShortcuts_1 = require("./hooks/useKeyboardShortcuts");
const useSettingsStore_1 = require("./stores/useSettingsStore");
const react_1 = require("react");
function App() {
    const { theme } = (0, useSettingsStore_1.useSettingsStore)();
    (0, useKeyboardShortcuts_1.useKeyboardShortcuts)();
    (0, react_1.useEffect)(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        }
        else {
            root.classList.add(theme);
        }
    }, [theme]);
    return (<ErrorBoundary_1.ErrorBoundary>
      <div className="min-h-screen bg-background">
        <react_router_dom_1.Routes>
          
          <react_router_dom_1.Route path="/auth/login" element={<Login_1.Login />}/>
          <react_router_dom_1.Route path="/auth/signup" element={<Signup_1.Signup />}/>
          <react_router_dom_1.Route path="/auth/profile" element={<Profile_1.Profile />}/>
          
          
          <react_router_dom_1.Route path="/app" element={<RequireAuth_1.RequireAuth><AppShell_1.AppShell /></RequireAuth_1.RequireAuth>}>
            <react_router_dom_1.Route path="chat" element={<Chat_1.Chat />}/>
            <react_router_dom_1.Route path="portfolio" element={<Portfolio_1.Portfolio />}/>
            <react_router_dom_1.Route path="admin" element={<RequireAdmin_1.RequireAdmin><Admin_1.Admin /></RequireAdmin_1.RequireAdmin>}/>
            <react_router_dom_1.Route path="settings" element={<Settings_1.Settings />}/>
            <react_router_dom_1.Route index element={<react_router_dom_1.Navigate to="/app/chat" replace/>}/>
          </react_router_dom_1.Route>
          
          
          <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/app/chat" replace/>}/>
          
          
          <react_router_dom_1.Route path="*" element={<NotFound_1.NotFound />}/>
        </react_router_dom_1.Routes>
        
        
        <sonner_1.Toaster position="top-right" expand={false} richColors closeButton toastOptions={{
            duration: 4000,
            style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))'
            }
        }}/>
      </div>
    </ErrorBoundary_1.ErrorBoundary>);
}
exports.default = App;
//# sourceMappingURL=App.js.map