"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = Login;
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const react_router_dom_1 = require("react-router-dom");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const card_1 = require("../../components/ui/card");
const useAuthStore_1 = require("../../stores/useAuthStore");
const use_toast_1 = require("../../hooks/use-toast");
const loginSchema = zod_2.z.object({
    email: zod_2.z.string().email('Please enter a valid email address'),
    password: zod_2.z.string().min(1, 'Password is required')
});
function Login() {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { login } = (0, useAuthStore_1.useAuthStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const from = location.state?.from?.pathname || '/app/chat';
    const { register, handleSubmit, formState: { errors } } = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(loginSchema)
    });
    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await login(data.email, data.password);
            toast({
                title: 'Welcome back!',
                description: 'You have been successfully logged in.'
            });
            navigate(from, { replace: true });
        }
        catch (error) {
            toast({
                title: 'Login failed',
                description: error instanceof Error ? error.message : 'An error occurred during login',
                variant: 'destructive'
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-background px-4">
      <card_1.Card className="w-full max-w-md">
        <card_1.CardHeader className="space-y-1">
          <card_1.CardTitle className="text-2xl font-bold text-center">Sign In</card_1.CardTitle>
          <card_1.CardDescription className="text-center">
            Enter your credentials to access your account
          </card_1.CardDescription>
        </card_1.CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <card_1.CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input_1.Input id="email" type="email" placeholder="Enter your email" {...register('email')} className={errors.email ? 'border-red-500' : ''}/>
              {errors.email && (<p className="text-sm text-red-500">{errors.email.message}</p>)}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input_1.Input id="password" type="password" placeholder="Enter your password" {...register('password')} className={errors.password ? 'border-red-500' : ''}/>
              {errors.password && (<p className="text-sm text-red-500">{errors.password.message}</p>)}
            </div>
          </card_1.CardContent>
          <card_1.CardFooter className="flex flex-col space-y-4">
            <button_1.Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button_1.Button>
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <react_router_dom_1.Link to="/auth/signup" className="text-primary hover:underline">
                Sign up
              </react_router_dom_1.Link>
            </p>
          </card_1.CardFooter>
        </form>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=Login.js.map