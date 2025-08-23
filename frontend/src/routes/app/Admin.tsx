import { useState, useRef } from 'react'
import { cn } from '../../lib/cn'
import { useBrandingStore } from '../../stores/useBrandingStore'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { useToast } from '../../hooks/use-toast'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  lastLogin: Date
  status: 'active' | 'inactive'
}

interface SystemMetric {
  label: string
  value: string | number
  change?: number
  icon: React.ReactNode
}

export function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { logo, title, favicon, setLogo, setTitle, setFavicon, resetBranding } = useBrandingStore()
  const { toast } = useToast()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [tempTitle, setTempTitle] = useState(title)
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      lastLogin: new Date(),
      status: 'active'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      lastLogin: new Date(Date.now() - 86400000),
      status: 'active'
    }
  ])

  const metrics: SystemMetric[] = [
    {
      label: 'Total Users',
      value: 1247,
      change: 12,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      label: 'Active Portfolios',
      value: 892,
      change: 8,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: 'API Calls Today',
      value: '15.2K',
      change: -3,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: 'System Uptime',
      value: '99.9%',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">System administration and management</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'dashboard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'branding'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Logs
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <div key={index} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    {metric.change !== undefined && (
                      <p className={cn(
                        'text-sm',
                        metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {metric.change >= 0 ? '+' : ''}{metric.change}% from last month
                      </p>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {metric.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">New user registration: jane@example.com</span>
                <span className="text-xs text-muted-foreground">2 minutes ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">Portfolio uploaded by john@example.com</span>
                <span className="text-xs text-muted-foreground">15 minutes ago</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-muted-foreground">API rate limit reached for user</span>
                <span className="text-xs text-muted-foreground">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">User Management</h3>
            <button className="btn btn-primary">Add User</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="py-3 px-4 text-foreground">{user.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        user.role === 'admin'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      )}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {user.lastLogin.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary hover:underline text-sm">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Customization</CardTitle>
              <CardDescription>
                Customize your application's logo, title, and favicon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Section */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Logo</label>
                  <p className="text-xs text-muted-foreground">Upload a logo image (PNG, JPG, SVG recommended)</p>
                </div>
                <div className="flex items-center space-x-4">
                  {logo && (
                    <div className="w-16 h-16 border border-border rounded-lg flex items-center justify-center bg-muted">
                      <img src={logo} alt="Current logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logo ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    {logo && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLogo(null)
                          toast({ title: 'Logo removed successfully' })
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const result = event.target?.result as string
                          setLogo(result)
                          toast({ title: 'Logo updated successfully' })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              </div>

              {/* Title Section */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Application Title</label>
                  <p className="text-xs text-muted-foreground">This will appear in the browser tab and header</p>
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="Enter application title"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      setTitle(tempTitle)
                      toast({ title: 'Title updated successfully' })
                    }}
                    disabled={tempTitle === title}
                  >
                    Update
                  </Button>
                </div>
              </div>

              {/* Favicon Section */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Favicon</label>
                  <p className="text-xs text-muted-foreground">Upload a favicon (ICO, PNG recommended, 16x16 or 32x32 pixels)</p>
                </div>
                <div className="flex items-center space-x-4">
                  {favicon && (
                    <div className="w-8 h-8 border border-border rounded flex items-center justify-center bg-muted">
                      <img src={favicon} alt="Current favicon" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      {favicon ? 'Change Favicon' : 'Upload Favicon'}
                    </Button>
                    {favicon && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFavicon(null)
                          toast({ title: 'Favicon removed successfully' })
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const result = event.target?.result as string
                          setFavicon(result)
                          toast({ title: 'Favicon updated successfully' })
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                </div>
              </div>

              {/* Reset Section */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Reset Branding</h4>
                    <p className="text-xs text-muted-foreground">Restore default logo, title, and favicon</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetBranding()
                      setTempTitle('Trae-Financial AI Assistant')
                      toast({ title: 'Branding reset to defaults' })
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Settings</h3>
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>System configuration coming soon</p>
              <p className="text-sm mt-2">API keys, rate limits, and system preferences</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Logs</h3>
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>System logs viewer coming soon</p>
              <p className="text-sm mt-2">Error logs, access logs, and system events</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}