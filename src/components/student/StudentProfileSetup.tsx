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
import { User, ArrowRight } from 'lucide-react';

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
            <User className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Student Profile Setup</CardTitle>
          <CardDescription>
            Enter your student index number to mark attendance. This is required for all attendance records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="indexNumber">
                Student Index Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="indexNumber"
                placeholder="Enter your index number"
                {...register('indexNumber')}
                className={errors.indexNumber ? "border-red-500" : ""}
                autoComplete="off"
              />
              {errors.indexNumber && (
                <p className="text-sm text-red-500">{errors.indexNumber.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your index number is required to mark attendance and will be attached to all your attendance records.
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                "Setting up..."
              ) : (
                <>
                  Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 