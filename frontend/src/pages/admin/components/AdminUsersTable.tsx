import React, { useState } from 'react';
import { useAdminUsers, useAdminLoadingStates, useAdminActions } from '../../../stores/useAdminStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Skeleton } from '../../../components/ui/skeleton';
import { Users, Search, Filter, Shield, User, Clock, MapPin } from 'lucide-react';
import { User as UserType } from '../../../services/adminService';
import { toast } from 'sonner';

export function AdminUsersTable() {
  const users = useAdminUsers();
  const { isLoadingUsers } = useAdminLoadingStates();
  const { setUserRole } = useAdminActions();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'USER' | 'ADMIN'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'username' | 'createdAt' | 'lastActive'>('username');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleRoleToggle = async (userId: string, currentRole: 'USER' | 'ADMIN') => {
    const newRole = currentRole === 'USER' ? 'ADMIN' : 'USER';
    try {
      await setUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const getActivityStatus = (lastActive: string) => {
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffInHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return { status: 'online', color: 'bg-green-100 text-green-800 border-green-200' };
    if (diffInHours < 24) return { status: 'recent', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    if (diffInHours < 168) return { status: 'this week', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { status: 'inactive', color: 'bg-gray-100 text-gray-800 border-gray-200' };
  };

  // Filter and sort users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesRegion = regionFilter === 'all' || user.region === regionFilter;
    return matchesSearch && matchesRole && matchesRegion;
  }) || [];

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: string | Date;
    let bValue: string | Date;
    
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
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const uniqueRegions = [...new Set(users?.map(user => user.region) || [])];

  const handleSort = (column: 'username' | 'createdAt' | 'lastActive') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoadingUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
          <Badge variant="secondary" className="ml-auto">
            {filteredUsers.length} users
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value: 'all' | 'USER' | 'ADMIN') => setRoleFilter(value)}>
              <SelectTrigger className="w-full sm:w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-2">
                      Username
                      {sortBy === 'username' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {sortBy === 'createdAt' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('lastActive')}
                  >
                    <div className="flex items-center gap-2">
                      Last Active
                      {sortBy === 'lastActive' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedUsers.map((user) => {
                    const activityStatus = getActivityStatus(user.lastActive);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              {user.email && (
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                            className={user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                          >
                            {user.role === 'ADMIN' ? (
                              <Shield className="h-3 w-3 mr-1" />
                            ) : (
                              <User className="h-3 w-3 mr-1" />
                            )}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {user.region}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={activityStatus.color}>
                              {activityStatus.status}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {getTimeAgo(user.lastActive)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleToggle(user.id, user.role)}
                            className="text-xs"
                          >
                            {user.role === 'USER' ? 'Make Admin' : 'Make User'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
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
      </CardContent>
    </Card>
  );
}