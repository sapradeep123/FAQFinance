"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signup = Signup;
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const react_router_dom_1 = require("react-router-dom");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const select_1 = require("../../components/ui/select");
const card_1 = require("../../components/ui/card");
const useAuthStore_1 = require("../../stores/useAuthStore");
const use_toast_1 = require("../../hooks/use-toast");
const signupSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_2.z.string().email('Please enter a valid email address'),
    username: zod_2.z.string().min(3, 'Username must be at least 3 characters'),
    password: zod_2.z.string().min(6, 'Password must be at least 6 characters'),
    region: zod_2.z.enum(['US', 'UK'], { required_error: 'Please select a region' }),
    currency: zod_2.z.enum(['USD', 'GBP', 'INR'], { required_error: 'Please select a currency' }),
    acceptTerms: zod_2.z.boolean().refine(val => val === true, {
        message: 'You must accept the terms and conditions'
    })
});
function Signup() {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { signup } = (0, useAuthStore_1.useAuthStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { register, handleSubmit, setValue, watch, formState: { errors } } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(signupSchema)
    });
    const watchRegion = watch('region');
    const watchCurrency = watch('currency');
    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await signup(data.name, data.email, data.password);
            toast({
                title: 'Account created successfully!',
                description: 'You can now sign in with your credentials.'
            });
            navigate('/auth/login');
        }
        catch (error) {
            toast({
                title: 'Signup failed',
                description: error instanceof Error ? error.message : 'An error occurred during signup',
                variant: 'destructive'
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <card_1.Card className="w-full max-w-md">
        <card_1.CardHeader className="space-y-1">
          <card_1.CardTitle className="text-2xl font-bold text-center">Create Account</card_1.CardTitle>
          <card_1.CardDescription className="text-center">
            Enter your information to create your account
          </card_1.CardDescription>
        </card_1.CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <card_1.CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <input_1.Input id="name" type="text" placeholder="Enter your full name" {...register('name')} className={errors.name ? 'border-red-500' : ''}/>
              {errors.name && (<p className="text-sm text-red-500">{errors.name.message}</p>)}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input_1.Input id="email" type="email" placeholder="Enter your email" {...register('email')} className={errors.email ? 'border-red-500' : ''}/>
              {errors.email && (<p className="text-sm text-red-500">{errors.email.message}</p>)}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input_1.Input id="username" type="text" placeholder="Choose a username" {...register('username')} className={errors.username ? 'border-red-500' : ''}/>
              {errors.username && (<p className="text-sm text-red-500">{errors.username.message}</p>)}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input_1.Input id="password" type="password" placeholder="Create a password" {...register('password')} className={errors.password ? 'border-red-500' : ''}/>
              {errors.password && (<p className="text-sm text-red-500">{errors.password.message}</p>)}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <select_1.Select onValueChange={(value) => setValue('region', value)}>
                  <select_1.SelectTrigger className={errors.region ? 'border-red-500' : ''}>
                    <select_1.SelectValue placeholder="Select region"/>
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="US">United States</select_1.SelectItem>
                    <select_1.SelectItem value="UK">United Kingdom</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
                {errors.region && (<p className="text-sm text-red-500">{errors.region.message}</p>)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select_1.Select onValueChange={(value) => setValue('currency', value)}>
                  <select_1.SelectTrigger className={errors.currency ? 'border-red-500' : ''}>
                    <select_1.SelectValue placeholder="Select currency"/>
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="USD">USD ($)</select_1.SelectItem>
                    <select_1.SelectItem value="GBP">GBP (£)</select_1.SelectItem>
                    <select_1.SelectItem value="INR">INR (₹)</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
                {errors.currency && (<p className="text-sm text-red-500">{errors.currency.message}</p>)}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input id="acceptTerms" type="checkbox" {...register('acceptTerms')} className="h-4 w-4 rounded border-gray-300"/>
              <label htmlFor="acceptTerms" className="text-sm">
                I accept the{' '}
                <react_router_dom_1.Link to="/terms" className="text-primary hover:underline">
                  Terms and Conditions
                </react_router_dom_1.Link>
              </label>
            </div>
            {errors.acceptTerms && (<p className="text-sm text-red-500">{errors.acceptTerms.message}</p>)}
          </card_1.CardContent>
          <card_1.CardFooter className="flex flex-col space-y-4">
            <button_1.Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button_1.Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <react_router_dom_1.Link to="/auth/login" className="text-primary hover:underline">
                Sign in
              </react_router_dom_1.Link>
            </p>
          </card_1.CardFooter>
        </form>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=Signup.js.map