"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Mail, Lock, AlertCircle, Building, User, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { authService } from '@/lib/services/auth.service';
import { useToast } from '@/hooks/use-toast';

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  displayName: z.string().min(3, "Display name is required (minimum 3 characters)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  institutionCode: z.string().min(4, "Institution code is required"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function LecturerAuthForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { setUserRole } = useAppContext();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [resendEmailLoading, setResendEmailLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      displayName: "",
      password: "",
      confirmPassword: "",
      institutionCode: "",
    },
  });
  
  const onLoginSubmit = async (data: LoginFormValues) => {
    setLoginLoading(true);
    try {
      const user = await authService.signIn(data.email, data.password);
      
      if (user) {
        if (user.role !== 'lecturer') {
          toast({
            title: "Access Denied",
            description: "This account is not registered as a lecturer",
            variant: "destructive",
          });
          setLoginLoading(false);
          return;
        }
        
        setUserRole('lecturer');
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error && error.message.includes('Email not confirmed||')) {
        const parts = error.message.split('||');
        if (parts.length >= 3) {
          const email = parts[1];
          const message = parts[2];
          
          setUnconfirmedEmail(email);
          
          toast({
            title: "Email Not Confirmed",
            description: message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: "Please confirm your email before logging in.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login Failed",
          description: error instanceof Error ? error.message : "An error occurred during login",
          variant: "destructive",
        });
      }
    } finally {
      setLoginLoading(false);
    }
  };
  
  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    
    setResendEmailLoading(true);
    try {
      const success = await authService.resendConfirmationEmail(unconfirmedEmail);
      
      if (success) {
        toast({
          title: "Confirmation Email Sent",
          description: `A new confirmation email has been sent to ${unconfirmedEmail}. Please check your inbox and spam folder.`,
        });
      } else {
        toast({
          title: "Failed to Resend",
          description: "We couldn't resend the confirmation email. Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      toast({
        title: "Failed to Resend",
        description: error instanceof Error ? error.message : "An error occurred while trying to resend the confirmation email",
        variant: "destructive",
      });
    } finally {
      setResendEmailLoading(false);
    }
  };
  
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setRegisterLoading(true);
    try {
      const user = await authService.signUpLecturer(
        data.email,
        data.password,
        data.displayName,
        data.institutionCode
      );
      
      if (user) {
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your account.",
        });
        (document.querySelector('[data-value="login"]') as HTMLElement)?.click();
        loginForm.setValue('email', data.email);
        loginForm.setValue('password', data.password);
      } else {
        toast({
          title: "Registration Failed",
          description: "Could not create your account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error && error.message.includes('already registered')) {
        (document.querySelector('[data-value="login"]') as HTMLElement)?.click();
        loginForm.setValue('email', data.email);
        loginForm.setValue('password', data.password);
        
        toast({
          title: "Already Registered",
          description: "This email is already registered. Please login instead.",
          variant: "default",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error instanceof Error ? error.message : "An error occurred during registration",
          variant: "destructive",
        });
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-800 dark:to-gray-950 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg dark:bg-gray-850 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="text-center p-6 pb-4">
          <div className="inline-flex items-center justify-center mb-3">
            <Briefcase className="h-10 w-10 text-blue-600 dark:text-blue-400 mr-3 animate-fade-in" />
            <CardTitle className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">Lecturer Portal</CardTitle>
          </div>
          <CardDescription className="text-md text-gray-700 dark:text-gray-400 mt-2">
            Login or create a new account to manage your classes and attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 text-lg rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400 rounded-lg transition-all duration-200"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-blue-400 rounded-lg transition-all duration-200"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login" className="space-y-6 animate-fade-in">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-base font-medium text-gray-800 dark:text-gray-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="e.g., example@institution.com"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-base font-medium text-gray-800 dark:text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Logging in...
                    </div>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="space-y-6 animate-fade-in">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-base font-medium text-gray-800 dark:text-gray-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="e.g., example@institution.com"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-displayName" className="text-base font-medium text-gray-800 dark:text-gray-200">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-displayName"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...registerForm.register("displayName")}
                    />
                  </div>
                  {registerForm.formState.errors.displayName && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-institutionCode" className="text-base font-medium text-gray-800 dark:text-gray-200">Institution Code</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-institutionCode"
                      type="text"
                      placeholder="Enter your institution code"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...registerForm.register("institutionCode")}
                    />
                  </div>
                  {registerForm.formState.errors.institutionCode && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {registerForm.formState.errors.institutionCode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-base font-medium text-gray-800 dark:text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...registerForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirmPassword" className="text-base font-medium text-gray-800 dark:text-gray-200">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 h-12 rounded-lg border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      {...registerForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating account...
                    </div>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {unconfirmedEmail && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                Please confirm your email address to continue.
              </p>
              <Button
                onClick={handleResendConfirmation}
                disabled={resendEmailLoading}
                className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all duration-200"
              >
                {resendEmailLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </div>
                ) : (
                  "Resend Confirmation Email"
                )}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              ← Back to Role Selection
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 