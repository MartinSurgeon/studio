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
import { User, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { authService } from '@/lib/services/auth.service';
import { useToast } from '@/hooks/use-toast';

// Form validation schemas
const loginSchema = z.object({
  indexNumber: z.string()
    .min(5, "Student ID is required and should be at least 5 digits")
    .refine(val => !val.includes('@'), {
      message: "Please enter your student ID number, not your email address"
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  indexNumber: z.string()
    .min(5, "Student ID is required and should be at least 5 digits")
    .refine(val => !val.includes('@'), {
      message: "Please enter your student ID number, not your email address"
    }),
  displayName: z.string().min(3, "Display name is required (minimum 3 characters)"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function StudentAuthPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { setUserRole, setStudentId } = useAppContext();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      indexNumber: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      indexNumber: "",
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const onLoginSubmit = async (data: LoginFormValues) => {
    setLoginLoading(true);
    try {
      const user = await authService.signInWithIndexNumber(data.indexNumber, data.password);
      
      if (user) {
        setUserRole('student');
        setStudentId(user.id);
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid index number or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Check if this is a "No account found" error
      if (error instanceof Error && 
          error.message.includes('No account found with index number')) {
        // Switch to register tab and pre-fill the index number
        (document.querySelector('[data-value="register"]') as HTMLElement)?.click();
        registerForm.setValue('indexNumber', data.indexNumber);
        
        toast({
          title: "Account Not Found",
          description: "We couldn't find an account with that student ID. Would you like to register?",
          variant: "default",
        });
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
  
  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setRegisterLoading(true);
    try {
      const user = await authService.signUpStudent(
        data.indexNumber,
        data.email,
        data.password,
        data.displayName
      );
      
      if (user) {
        // Automatically log the user in after successful registration
        setUserRole('student');
        setStudentId(user.id);
        toast({
          title: "Registration Successful",
          description: "Welcome! Your account has been created successfully.",
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Registration Failed",
          description: "Could not create your account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Switch to login tab if the user is already registered
      if (error instanceof Error && 
          error.message.includes('already registered')) {
        (document.querySelector('[data-value="login"]') as HTMLElement)?.click();
        loginForm.setValue('indexNumber', data.indexNumber);
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
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-lg dark:bg-gray-850 border border-gray-200 dark:border-gray-700">
        <CardHeader className="text-center p-6 pb-4">
          <div className="inline-flex items-center justify-center mb-3">
            <User className="h-10 w-10 text-blue-600 dark:text-blue-400 mr-3 animate-fade-in" />
            <CardTitle className="text-4xl font-extrabold text-gray-900 dark:text-gray-50">Student Portal</CardTitle>
          </div>
          <CardDescription className="text-md text-gray-700 dark:text-gray-400 mt-2">
            Login with your student ID or create a new account to get started with Trakzy.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 text-lg">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Login</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login" className="space-y-6">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-index-number" className="text-base font-medium text-gray-800 dark:text-gray-200">Student ID (Index Number)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-index-number"
                      placeholder="e.g., 12345678"
                      className="pl-10 pr-4 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...loginForm.register("indexNumber")}
                    />
                  </div>
                  {loginForm.formState.errors.indexNumber && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {loginForm.formState.errors.indexNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your numeric student ID (e.g., 22000000).
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-base font-medium text-gray-800 dark:text-gray-200">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...loginForm.register("password")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </div>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-8 py-2 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    "Login"
                  )}
                </Button>
                
                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <a 
                      onClick={() => (document.querySelector('[data-value="register"]') as HTMLElement)?.click()} 
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 font-medium cursor-pointer transition-colors duration-200"
                    >
                      Register Here
                    </a>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <Link href="/auth/forgot-password"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 font-medium transition-colors duration-200"
                    >
                      Forgot Password?
                    </Link>
                  </p>
                </div>
              </form>
            </TabsContent>
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                ← Back to Role Selection
              </Link>
            </div>
            {/* Register Form */}
            <TabsContent value="register" className="space-y-6">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="register-index-number" className="text-base font-medium text-gray-800 dark:text-gray-200">Student ID (Index Number)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-index-number"
                      placeholder="e.g., 12345678"
                      className="pl-10 pr-4 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...registerForm.register("indexNumber")}
                    />
                  </div>
                  {registerForm.formState.errors.indexNumber && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {registerForm.formState.errors.indexNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter your numeric student ID (e.g., 22000000).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-display-name" className="text-base font-medium text-gray-800 dark:text-gray-200">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-display-name"
                      placeholder="e.g., John Doe"
                      className="pl-10 pr-4 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...registerForm.register("displayName")}
                    />
                  </div>
                  {registerForm.formState.errors.displayName && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-base font-medium text-gray-800 dark:text-gray-200">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="e.g., example@email.com"
                      className="pl-10 pr-4 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {registerForm.formState.errors.email.message}
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
                      className="pl-10 pr-10 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...registerForm.register("password")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </div>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-base font-medium text-gray-800 dark:text-gray-200">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 py-2 text-base rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      {...registerForm.register("confirmPassword")}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </div>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1 animate-fade-in">
                      <AlertCircle className="h-4 w-4" />
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-8 py-2 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    "Register Account"
                  )}
                </Button>

                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{" "}
                    <a 
                      onClick={() => (document.querySelector('[data-value="login"]') as HTMLElement)?.click()} 
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 font-medium cursor-pointer transition-colors duration-200"
                    >
                      Login Here
                    </a>
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400 opacity-90">
        <p>&copy; {new Date().getFullYear()} Trakzy. All rights reserved.</p>
      </div>
    </div>
  );
} 