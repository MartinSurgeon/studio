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
import { User, Mail, Lock, AlertCircle } from 'lucide-react';
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
        setUserRole('student');
        setStudentId(user.id);
        toast({
          title: "Registration Successful",
          description: "Your account has been created",
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-primary mr-2" />
            <CardTitle className="text-3xl font-bold">Student Portal</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Login with your student ID or register if you're new
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-index-number">Student ID (Index Number)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-index-number"
                      placeholder="Enter your student ID number (not email)"
                      className="pl-9"
                      {...loginForm.register("indexNumber")}
                    />
                  </div>
                  {loginForm.formState.errors.indexNumber && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.indexNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your numeric student ID, not your email address.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-9"
                      {...loginForm.register("password")}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Logging in..." : "Login"}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <a 
                      onClick={() => (document.querySelector('[data-value="register"]') as HTMLElement)?.click()} 
                      className="text-primary font-medium cursor-pointer"
                    >
                      Register
                    </a>
                  </p>
                </div>
              </form>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-index-number">Student ID (Index Number)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-index-number"
                      placeholder="Enter your student ID number (not email)"
                      className="pl-9"
                      {...registerForm.register("indexNumber")}
                    />
                  </div>
                  {registerForm.formState.errors.indexNumber && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {registerForm.formState.errors.indexNumber.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your numeric student ID, not your email address.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-display-name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-display-name"
                      placeholder="Enter your full name"
                      className="pl-9"
                      {...registerForm.register("displayName")}
                    />
                  </div>
                  {registerForm.formState.errors.displayName && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {registerForm.formState.errors.displayName.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-9"
                      {...registerForm.register("email")}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password"
                      className="pl-9"
                      {...registerForm.register("password")}
                    />
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      className="pl-9"
                      {...registerForm.register("confirmPassword")}
                    />
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={registerLoading}
                >
                  {registerLoading ? "Creating Account..." : "Create Account"}
                </Button>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a 
                      onClick={() => (document.querySelector('[data-value="login"]') as HTMLElement)?.click()} 
                      className="text-primary font-medium cursor-pointer"
                    >
                      Login
                    </a>
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center">
        <Link href="/" className="text-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
} 