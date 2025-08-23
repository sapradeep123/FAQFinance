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
exports.AdminUsersTable = AdminUsersTable;
const react_1 = __importStar(require("react"));
const useAdminStore_1 = require("../../../stores/useAdminStore");
const card_1 = require("../../../components/ui/card");
const button_1 = require("../../../components/ui/button");
const badge_1 = require("../../../components/ui/badge");
const input_1 = require("../../../components/ui/input");
const select_1 = require("../../../components/ui/select");
const table_1 = require("../../../components/ui/table");
const skeleton_1 = require("../../../components/ui/skeleton");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
function AdminUsersTable() {
    const users = (0, useAdminStore_1.useAdminUsers)();
    const { isLoadingUsers } = (0, useAdminStore_1.useAdminLoadingStates)();
    const { setUserRole } = (0, useAdminStore_1.useAdminActions)();
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [roleFilter, setRoleFilter] = (0, react_1.useState)('all');
    const [regionFilter, setRegionFilter] = (0, react_1.useState)('all');
    const [sortBy, setSortBy] = (0, react_1.useState)('username');
    const [sortOrder, setSortOrder] = (0, react_1.useState)('asc');
    const handleRoleToggle = async (userId, currentRole) => {
        const newRole = currentRole === 'USER' ? 'ADMIN' : 'USER';
        try {
            await setUserRole(userId, newRole);
            sonner_1.toast.success(`User role updated to ${newRole}`);
        }
        catch (error) {
            sonner_1.toast.error('Failed to update user role');
        }
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        if (diffInHours < 1)
            return 'Just now';
        if (diffInHours < 24)
            return `${diffInHours}h ago`;
        if (diffInHours < 168)
            return `${Math.floor(diffInHours / 24)}d ago`;
        return `${Math.floor(diffInHours / 168)}w ago`;
    };
    const getActivityStatus = (lastActive) => {
        const now = new Date();
        const lastActiveDate = new Date(lastActive);
        const diffInHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
        if (diffInHours < 1)
            return { status: 'online', color: 'bg-green-100 text-green-800 border-green-200' };
        if (diffInHours < 24)
            return { status: 'recent', color: 'bg-blue-100 text-blue-800 border-blue-200' };
        if (diffInHours < 168)
            return { status: 'this week', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
        return { status: 'inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    };
    const filteredUsers = users?.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesRegion = regionFilter === 'all' || user.region === regionFilter;
        return matchesSearch && matchesRole && matchesRegion;
    }) || [];
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let aValue;
        let bValue;
        switch (sortBy) {
            case 'username':
                aValue = a.username;
                bValue = b.username;
                break;
            case 'createdAt':
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
            case 'lastActive':
                aValue = new Date(a.lastActive);
                bValue = new Date(b.lastActive);
                break;
            default:
                aValue = a.username;
                bValue = b.username;
        }
        if (aValue < bValue)
            return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue)
            return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
    const uniqueRegions = [...new Set(users?.map(user => user.region) || [])];
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };
    if (isLoadingUsers) {
        return (<card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Users className="h-5 w-5"/>
            User Management
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <skeleton_1.Skeleton className="h-10 flex-1"/>
              <skeleton_1.Skeleton className="h-10 w-32"/>
              <skeleton_1.Skeleton className="h-10 w-32"/>
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (<skeleton_1.Skeleton key={i} className="h-16 w-full"/>))}
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Users className="h-5 w-5"/>
          User Management
          <badge_1.Badge variant="secondary" className="ml-auto">
            {filteredUsers.length} users
          </badge_1.Badge>
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
              <input_1.Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
            </div>
            <select_1.Select value={roleFilter} onValueChange={(value) => setRoleFilter(value)}>
              <select_1.SelectTrigger className="w-full sm:w-32">
                <lucide_react_1.Filter className="h-4 w-4 mr-2"/>
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">All Roles</select_1.SelectItem>
                <select_1.SelectItem value="USER">Users</select_1.SelectItem>
                <select_1.SelectItem value="ADMIN">Admins</select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select value={regionFilter} onValueChange={setRegionFilter}>
              <select_1.SelectTrigger className="w-full sm:w-32">
                <lucide_react_1.MapPin className="h-4 w-4 mr-2"/>
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">All Regions</select_1.SelectItem>
                {uniqueRegions.map(region => (<select_1.SelectItem key={region} value={region}>{region}</select_1.SelectItem>))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          
          <div className="border rounded-lg">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('username')}>
                    <div className="flex items-center gap-2">
                      Username
                      {sortBy === 'username' && (<span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>)}
                    </div>
                  </table_1.TableHead>
                  <table_1.TableHead>Role</table_1.TableHead>
                  <table_1.TableHead>Region</table_1.TableHead>
                  <table_1.TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-2">
                      Created
                      {sortBy === 'createdAt' && (<span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>)}
                    </div>
                  </table_1.TableHead>
                  <table_1.TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('lastActive')}>
                    <div className="flex items-center gap-2">
                      Last Active
                      {sortBy === 'lastActive' && (<span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>)}
                    </div>
                  </table_1.TableHead>
                  <table_1.TableHead>Actions</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {sortedUsers.length === 0 ? (<table_1.TableRow>
                    <table_1.TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </table_1.TableCell>
                  </table_1.TableRow>) : (sortedUsers.map((user) => {
            const activityStatus = getActivityStatus(user.lastActive);
            return (<table_1.TableRow key={user.id}>
                        <table_1.TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              {user.email && (<div className="text-sm text-muted-foreground">{user.email}</div>)}
                            </div>
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <badge_1.Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className={user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}>
                            {user.role === 'ADMIN' ? (<lucide_react_1.Shield className="h-3 w-3 mr-1"/>) : (<lucide_react_1.User className="h-3 w-3 mr-1"/>)}
                            {user.role}
                          </badge_1.Badge>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center gap-2">
                            <lucide_react_1.MapPin className="h-4 w-4 text-muted-foreground"/>
                            {user.region}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="text-sm">
                            {formatDate(user.createdAt)}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center gap-2">
                            <badge_1.Badge className={activityStatus.color}>
                              {activityStatus.status}
                            </badge_1.Badge>
                            <div className="text-xs text-muted-foreground">
                              {getTimeAgo(user.lastActive)}
                            </div>
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <button_1.Button variant="outline" size="sm" onClick={() => handleRoleToggle(user.id, user.role)} className="text-xs">
                            {user.role === 'USER' ? 'Make Admin' : 'Make User'}
                          </button_1.Button>
                        </table_1.TableCell>
                      </table_1.TableRow>);
        }))}
              </table_1.TableBody>
            </table_1.Table>
          </div>

          
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Showing {sortedUsers.length} of {users?.length || 0} users
            </div>
            <div className="flex gap-4">
              <span>Admins: {users?.filter(u => u.role === 'ADMIN').length || 0}</span>
              <span>Users: {users?.filter(u => u.role === 'USER').length || 0}</span>
            </div>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
//# sourceMappingURL=AdminUsersTable.js.map