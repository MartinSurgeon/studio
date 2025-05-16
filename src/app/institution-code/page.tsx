"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, ArrowLeft, LockKeyhole, School } from 'lucide-react';

export default function InstitutionCodePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <Building className="h-10 w-10 text-primary mr-2" />
            <CardTitle className="text-3xl font-bold">Institution Codes</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            How to get your institution code for lecturer registration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-lg font-semibold flex items-center">
                <LockKeyhole className="mr-2 h-5 w-5 text-primary" />
                What is an Institution Code?
              </h3>
              <p className="mt-2 text-muted-foreground">
                Institution codes are special access codes provided to lecturers that verify their 
                affiliation with the educational institution. They help ensure that only authorized 
                staff can create classes and manage attendance.
              </p>
            </div>
            
            <div className="p-4 bg-secondary/30 rounded-lg">
              <h3 className="text-lg font-semibold flex items-center">
                <School className="mr-2 h-5 w-5 text-primary" />
                How to Get Your Code
              </h3>
              <div className="mt-2 space-y-3 text-muted-foreground">
                <p>
                  There are several ways to get your institution code:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Contact your department administrator or IT services</li>
                  <li>For instructors, codes are often provided during faculty onboarding</li>
                  <li>If you're a teaching assistant, request a code from your supervising faculty</li>
                </ol>
                <p className="mt-3 font-medium text-foreground">
                  Current valid institution codes for demonstration purposes:
                </p>
                <ul className="bg-primary/10 p-3 rounded font-mono text-primary space-y-1">
                  <li>LECTURER2024</li>
                  <li>DEMO2024</li>
                  <li>TEST2024</li>
                </ul>
                <p className="text-xs italic">
                  Note: In a production environment, these codes would not be publicly displayed.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <Link href="/auth/lecturer">
              <Button className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lecturer Registration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 