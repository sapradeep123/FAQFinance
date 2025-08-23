import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { useAuthStore } from '../../stores/useAuthStore'
import { useToast } from '../../hooks/use-toast'
import { authService } from '../../services/authService'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address')
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const { user, updateProfile } = useAuthStore()
  const { toast } = useToast()

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || ''
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors }
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email
      })
    }
  }, [user, resetProfile])

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      await updateProfile(data)
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.'
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsPasswordLoading(true)
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      toast({
        title: 'Password changed',
        description: 'Your password has been successfully changed.'
      })
      setIsPasswordModalOpen(false)
      resetPassword()
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: error instanceof Error ? error.message : 'Failed to change password',
        variant: 'destructive'
      })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Manage your account details and personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  disabled={!isEditing}
                  {...registerProfile('name')}
                  className={profileErrors.name ? 'border-red-500' : ''}
                />
                {profileErrors.name && (
                  <p className="text-sm text-red-500">{profileErrors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  disabled={!isEditing}
                  {...registerProfile('email')}
                  className={profileErrors.email ? 'border-red-500' : ''}
                />
                {profileErrors.email && (
                  <p className="text-sm text-red-500">{profileErrors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  value={user.role === 'admin' ? 'Administrator' : 'User'}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                {!isEditing ? (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">Change your account password</p>
                </div>
                <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Change Password</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="currentPassword" className="text-sm font-medium">
                            Current Password
                          </label>
                          <Input
                            id="currentPassword"
                            type="password"
                            placeholder="Enter current password"
                            {...registerPassword('currentPassword')}
                            className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                          />
                          {passwordErrors.currentPassword && (
                            <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="newPassword" className="text-sm font-medium">
                            New Password
                          </label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="Enter new password"
                            {...registerPassword('newPassword')}
                            className={passwordErrors.newPassword ? 'border-red-500' : ''}
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="text-sm font-medium">
                            Confirm New Password
                          </label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            {...registerPassword('confirmPassword')}
                            className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isPasswordLoading}>
                          {isPasswordLoading ? 'Changing...' : 'Change Password'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}