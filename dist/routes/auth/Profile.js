"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profile = Profile;
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const card_1 = require("../../components/ui/card");
const dialog_1 = require("../../components/ui/dialog");
const useAuthStore_1 = require("../../stores/useAuthStore");
const use_toast_1 = require("../../hooks/use-toast");
const authService_1 = require("../../services/authService");
const profileSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_2.z.string().email('Please enter a valid email address')
});
const passwordSchema = zod_2.z.object({
    currentPassword: zod_2.z.string().min(1, 'Current password is required'),
    newPassword: zod_2.z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: zod_2.z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
});
function Profile() {
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isPasswordLoading, setIsPasswordLoading] = (0, react_1.useState)(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = (0, react_1.useState)(false);
    const { user, updateProfile } = (0, useAuthStore_1.useAuthStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const { register: registerProfile, handleSubmit: handleSubmitProfile, reset: resetProfile, formState: { errors: profileErrors } } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(profileSchema),
        defaultValues: {
            name: user?.name || '',
            email: user?.email || ''
        }
    });
    const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPassword, formState: { errors: passwordErrors } } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(passwordSchema)
    });
    (0, react_1.useEffect)(() => {
        if (user) {
            resetProfile({
                name: user.name,
                email: user.email
            });
        }
    }, [user, resetProfile]);
    const onSubmitProfile = async (data) => {
        setIsLoading(true);
        try {
            await updateProfile(data);
            toast({
                title: 'Profile updated',
                description: 'Your profile has been successfully updated.'
            });
            setIsEditing(false);
        }
        catch (error) {
            toast({
                title: 'Update failed',
                description: error instanceof Error ? error.message : 'Failed to update profile',
                variant: 'destructive'
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const onSubmitPassword = async (data) => {
        setIsPasswordLoading(true);
        try {
            await authService_1.authService.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            toast({
                title: 'Password changed',
                description: 'Your password has been successfully changed.'
            });
            setIsPasswordModalOpen(false);
            resetPassword();
        }
        catch (error) {
            toast({
                title: 'Password change failed',
                description: error instanceof Error ? error.message : 'Failed to change password',
                variant: 'destructive'
            });
        }
        finally {
            setIsPasswordLoading(false);
        }
    };
    const handleCancelEdit = () => {
        setIsEditing(false);
        if (user) {
            resetProfile({
                name: user.name,
                email: user.email
            });
        }
    };
    if (!user) {
        return (<div className="min-h-screen flex items-center justify-center bg-background">
        <card_1.Card className="w-full max-w-md">
          <card_1.CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to view your profile.</p>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    return (<div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Profile Information</card_1.CardTitle>
            <card_1.CardDescription>
              Manage your account details and personal information
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <input_1.Input id="name" type="text" disabled={!isEditing} {...registerProfile('name')} className={profileErrors.name ? 'border-red-500' : ''}/>
                {profileErrors.name && (<p className="text-sm text-red-500">{profileErrors.name.message}</p>)}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input_1.Input id="email" type="email" disabled={!isEditing} {...registerProfile('email')} className={profileErrors.email ? 'border-red-500' : ''}/>
                {profileErrors.email && (<p className="text-sm text-red-500">{profileErrors.email.message}</p>)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <input_1.Input value={user.role === 'admin' ? 'Administrator' : 'User'} disabled className="bg-muted"/>
              </div>
              
              <div className="flex gap-2 pt-4">
                {!isEditing ? (<button_1.Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button_1.Button>) : (<>
                    <button_1.Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button_1.Button>
                    <button_1.Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </button_1.Button>
                  </>)}
              </div>
            </form>
          </card_1.CardContent>
        </card_1.Card>

        
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Security</card_1.CardTitle>
            <card_1.CardDescription>
              Manage your password and security settings
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">Change your account password</p>
                </div>
                <dialog_1.Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                  <dialog_1.DialogTrigger asChild>
                    <button_1.Button variant="outline">Change Password</button_1.Button>
                  </dialog_1.DialogTrigger>
                  <dialog_1.DialogContent>
                    <dialog_1.DialogHeader>
                      <dialog_1.DialogTitle>Change Password</dialog_1.DialogTitle>
                      <dialog_1.DialogDescription>
                        Enter your current password and choose a new one.
                      </dialog_1.DialogDescription>
                    </dialog_1.DialogHeader>
                    <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label htmlFor="currentPassword" className="text-sm font-medium">
                            Current Password
                          </label>
                          <input_1.Input id="currentPassword" type="password" placeholder="Enter current password" {...registerPassword('currentPassword')} className={passwordErrors.currentPassword ? 'border-red-500' : ''}/>
                          {passwordErrors.currentPassword && (<p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>)}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="newPassword" className="text-sm font-medium">
                            New Password
                          </label>
                          <input_1.Input id="newPassword" type="password" placeholder="Enter new password" {...registerPassword('newPassword')} className={passwordErrors.newPassword ? 'border-red-500' : ''}/>
                          {passwordErrors.newPassword && (<p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>)}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="text-sm font-medium">
                            Confirm New Password
                          </label>
                          <input_1.Input id="confirmPassword" type="password" placeholder="Confirm new password" {...registerPassword('confirmPassword')} className={passwordErrors.confirmPassword ? 'border-red-500' : ''}/>
                          {passwordErrors.confirmPassword && (<p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>)}
                        </div>
                      </div>
                      <dialog_1.DialogFooter>
                        <button_1.Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                          Cancel
                        </button_1.Button>
                        <button_1.Button type="submit" disabled={isPasswordLoading}>
                          {isPasswordLoading ? 'Changing...' : 'Change Password'}
                        </button_1.Button>
                      </dialog_1.DialogFooter>
                    </form>
                  </dialog_1.DialogContent>
                </dialog_1.Dialog>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>);
}
//# sourceMappingURL=Profile.js.map