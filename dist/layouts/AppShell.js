"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
const react_router_dom_1 = require("react-router-dom");
const Header_1 = require("../components/Header");
const Sidebar_1 = require("../components/Sidebar");
function AppShell() {
    return (<div className="flex h-screen bg-background">
      
      <Sidebar_1.Sidebar />
      
      
      <div className="flex flex-1 flex-col overflow-hidden">
        
        <Header_1.Header />
        
        
        <main className="flex-1 overflow-auto p-6">
          <react_router_dom_1.Outlet />
        </main>
      </div>
    </div>);
}
//# sourceMappingURL=AppShell.js.map