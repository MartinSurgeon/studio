"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { User, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const studentProfileSchema = z.object({
  indexNumber: z.string()
    .min(3, { message: "Index number must be at least 3 characters" })
    .max(20, { message: "Index number must not exceed 20 characters" })
    .regex(/^[a-zA-Z0-9\/\-_.]+$/, { 
      message: "Index number can only contain letters, numbers, and these characters: / - _ ." 
    })
    .nonempty({ message: "Index number is required for attendance marking" }),
});

type StudentProfileFormData = z.infer<typeof studentProfileSchema>;

export default function StudentProfileSetup() {
  const { setStudentId } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentProfileFormData>({
    resolver: zodResolver(studentProfileSchema),
  });

  const onSubmit = async (data: StudentProfileFormData) => {
    setIsLoading(true);
    try {
      // Save student ID to context
      setStudentId(data.indexNumber);
      
      toast({
        title: "Profile Updated",
        description: "Your student index number has been set successfully."
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <User className="h-12 w-12 text-primary" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Student Profile Setup</CardTitle>
          <CardDescription className="text-base">
            Welcome to GeoAttend! Let's set up your student profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Why do we need your index number?</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                To uniquely identify you in the attendance system
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                To track your attendance across all your classes
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                To generate accurate attendance reports
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="indexNumber" className="text-base">
                Student Index Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="indexNumber"
                  placeholder="e.g., STU/2024/001"
                  {...register('indexNumber')}
                  className={cn(
                    "pl-9",
                    errors.indexNumber ? "border-red-500 focus-visible:ring-red-500" : ""
                  )}
                  autoComplete="off"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {errors.indexNumber && (
                <div className="flex items-start space-x-2 text-red-600">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{errors.indexNumber.message}</p>
                </div>
              )}
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium">Your index number should:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                    Be at least 3 characters long
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                    Not exceed 20 characters
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                    Only contain letters, numbers, and / - _ .
                  </li>
                </ul>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Setting up your profile...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 