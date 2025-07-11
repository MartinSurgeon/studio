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
      
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoginLoading(false);
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
        // Automatically log the user in after successful registration
        setUserRole('lecturer');
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
    <div className="relative min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-950 p-0">
      {/* Mobile background video */}
      <video
        src="/icons/male%20student%20running.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 block md:hidden blur-sm brightness-50"
        aria-label="Male student running animation background"
      />
      {/* Desktop side video */}
      <div className="hidden md:flex w-1/2 h-screen items-center justify-center bg-transparent">
        <video
          src="/icons/male%20student%20running.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover rounded-none"
          aria-label="Male student running animation"
        />
      </div>
      {/* Auth form section (overlay on mobile, right side on desktop) */}
      <div className="relative z-10 w-full md:w-1/2 flex flex-col items-center justify-center min-h-screen bg-white/90 dark:bg-gray-900/80 md:bg-transparent md:dark:bg-transparent p-4 md:p-0">
        <div className="max-w-md w-full mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300">Together, We Make Every Class Count!</h2>
            <p className="text-md text-gray-700 dark:text-gray-300 mt-1">Your presence and participation help build a stronger learning community.</p>
          </div>
          <Card className="w-full shadow-xl rounded-lg dark:bg-gray-850 border border-gray-200 dark:border-gray-700">
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
      </div>
    </div>
  );
} 