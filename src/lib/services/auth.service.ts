import { supabase, handleSupabaseError } from '@/lib/supabase';
import type { Tables } from '@/lib/database.types';
import type { UserRole } from '@/lib/types';

// Utility function to handle rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface UserData {
  id: string;
  email: string;
  indexNumber?: string;
  displayName?: string;
  role: UserRole;
}

// Valid institution codes - in a real application, these would be stored securely
// and managed through an admin interface
const VALID_INSTITUTION_CODES = [
  "LECTURER2024", 
  "DEMO2024",
  "TEST2024"
];

export const authService = {
  // Get the current user
  async getCurrentUser(): Promise<UserData | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) return null;
      
      // Special handling for specific user ID (for debugging)
      if (session.user.id === '0d25a2f7-a6ba-48af-93f4-14d9ef63e964') {
        console.log('Special handling for user with ID: 0d25a2f7-a6ba-48af-93f4-14d9ef63e964');
        return {
          id: session.user.id,
          email: session.user.email!,
          indexNumber: session.user.user_metadata?.index_number || '12345678',
          displayName: session.user.user_metadata?.display_name || 'Test User',
          role: session.user.user_metadata?.role || 'lecturer'
        };
      }
      
      // Get the user's role from the profiles table
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          // Check if this is a "no rows" error
          if (userError.code === 'PGRST116') {
            console.log('User not found in profiles table, checking auth metadata');
            // Try to get data from auth metadata
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.user_metadata) {
              const metadata = authData.user.user_metadata;
              return {
                id: session.user.id,
                email: session.user.email!,
                indexNumber: metadata.index_number,
                displayName: metadata.display_name,
                role: metadata.role || 'student' // Default to student if not specified
              };
            }
            // If no metadata, return basic user info
            return {
              id: session.user.id,
              email: session.user.email!,
              role: 'student' // Default to student
            };
          }
          throw userError;
        }
        
        if (!userData) {
          // Return basic user data if profile doesn't exist
          return {
            id: session.user.id,
            email: session.user.email!,
            role: 'student' // Default to student
          };
        }
        
        return {
          id: userData.id,
          email: userData.email,
          indexNumber: userData.index_number || undefined,
          displayName: userData.display_name ?? undefined,
          role: userData.role as UserRole || 'lecturer'
        };
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to using auth data only
        return {
          id: session.user.id,
          email: session.user.email!,
          role: 'student' // Default to student
        };
      }
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Sign in with email and password for lecturers
  async signIn(email: string, password: string): Promise<UserData | null> {
    try {
      // Check if the user exists first to provide better error messages
      const { data: authData, error: lookupError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (lookupError) {
        // Provide more helpful error messages
        if (lookupError.message.includes('Invalid login credentials')) {
          console.log('Invalid credentials error. Checking if user exists...');
          
          // Check if the email exists but password is wrong
          // Unfortunately, Supabase doesn't provide a direct way to check if an email exists
          // So we'll give a general error message that's helpful but doesn't leak information
          throw new Error(
            'Login failed. Please check your email and password. ' +
            'If you recently registered, you may need to confirm your email first.'
          );
        }
        
        if (lookupError.message.includes('Email not confirmed')) {
          // Store the unconfirmed email so we can offer to resend the confirmation
          const unconfirmedEmail = email;
          throw new Error(
            'Email not confirmed||' + unconfirmedEmail + '||' +
            'Please check your email inbox and confirm your email address before logging in. ' +
            'If you cannot find the confirmation email, you can request a new confirmation email.'
          );
        }
        
        throw lookupError;
      }
      
      if (!authData.user) return null;
      
      // Get the user's role from the profiles table
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (userError) {
          console.error('Error fetching user profile:', userError);
          // If we can't find the user profile, but auth succeeded, create a basic return
          
          // Try to create a minimal user record if it doesn't exist yet
          try {
            // Attempt to create a basic profile for the user
            const role = email.includes('student') || email.includes('stu') ? 'student' : 'lecturer';
            const { data: createdUserData, error: createError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: authData.user.email!,
                role: role,
                display_name: authData.user.user_metadata?.display_name || authData.user.email!.split('@')[0]
              })
              .select()
              .single();
              
            if (!createError && createdUserData) {
              console.log('Created missing user profile');
              return {
                id: createdUserData.id,
                email: createdUserData.email,
                displayName: createdUserData.display_name ?? undefined,
                role: createdUserData.role
              };
            }
          } catch (createProfileError) {
            console.error('Failed to create missing profile:', createProfileError);
          }
          
          // Fallback if profile creation failed
          return {
            id: authData.user.id,
            email: authData.user.email!,
            displayName: authData.user.user_metadata?.display_name ?? authData.user.email!.split('@')[0],
            role: authData.user.user_metadata?.role || 'lecturer' // Default to lecturer for this method
          };
        }
        
        if (!userData) {
          console.log('User authenticated but no profile exists');
          return {
            id: authData.user.id,
            email: authData.user.email!,
            displayName: authData.user.user_metadata?.display_name ?? authData.user.email!.split('@')[0],
            role: 'lecturer' // Default role for this method
          };
        }
        
        return {
          id: userData.id,
          email: userData.email,
          indexNumber: userData.index_number || undefined,
          displayName: userData.display_name ?? undefined,
          role: userData.role as UserRole || 'lecturer'
        };
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to using auth data only
        return {
          id: authData.user.id,
          email: authData.user.email!,
          displayName: authData.user.user_metadata?.display_name ?? authData.user.email!.split('@')[0],
          role: 'lecturer' // Default to lecturer for this method
        };
      }
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Sign in with student index number
  async signInWithIndexNumber(indexNumber: string, password: string): Promise<UserData | null> {
    try {
      // Check if the input looks like an email address
      if (indexNumber.includes('@')) {
        throw new Error(`It looks like you entered an email address instead of an index number. If you're a student, please use your student ID number. If you're a lecturer, please use the lecturer login option.`);
      }

      // Validate index number format
      if (!this.validateIndexNumber(indexNumber)) {
        throw new Error('Invalid index number format. Please use your official student ID.');
      }
      
      // First, find the user with the given index number
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, id')
        .eq('index_number', indexNumber)
        .eq('role', 'student')
        .single();
      
      if (userError) {
        // If we can't find a user with this index number
        if (userError.code === 'PGRST116') {
          throw new Error(`No account found with index number ${indexNumber}. Please register first if you're a new student.`);
        }
        throw userError;
      }
      
      if (!userData || !userData.email) {
        throw new Error(`No account found with index number ${indexNumber}.`);
      }
      
      // Then use the email to sign in
      const result = await this.signIn(userData.email, password);
      
      // If sign in failed but we found the user, it's likely a password issue
      if (!result) {
        throw new Error('Incorrect password. Please try again or use the password reset option.');
      }
      
      return result;
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Sign up a new lecturer with email
  async signUpLecturer(
    email: string, 
    password: string,
    displayName: string,
    institutionCode: string
  ): Promise<UserData | null> {
    try {
      // Check if the institution code is valid
      if (!this.validateInstitutionCode(institutionCode)) {
        throw new Error('Invalid institution code. Please contact your institution administrator.');
      }
      
      // Add a reasonable delay to handle rate limiting issues
      await sleep(2000);
      
      console.log('Creating auth user for lecturer:', email);
      
      // Create the user in Supabase Auth
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        // Handle rate limiting specifically
        if (error.message && error.message.includes('security purposes')) {
          const waitTimeMatch = error.message.match(/after (\d+) seconds/);
          if (waitTimeMatch && waitTimeMatch[1]) {
            const waitTime = parseInt(waitTimeMatch[1]);
            throw new Error(`Please wait ${waitTime} seconds before trying again.`);
          } else {
            throw new Error('Please wait a moment before trying again.');
          }
        }
        
        // Handle user already registered error
        if (error.message && error.message.includes('already registered')) {
          // Try to sign in with these credentials instead
          console.log('User already exists, attempting to sign in instead');
          try {
            return await this.signIn(email, password);
          } catch (signInError) {
            // If sign in also fails, throw a more helpful error
            throw new Error('This email is already registered. Please use the login page or try a different email.');
          }
        }
        
        throw error;
      }
      
      if (!user) return null;
      
      console.log('Auth user created:', user.id);
      console.log('Inserting user profile data');
      
      // Create a profile in our profiles table - use snake_case for column names
      try {
        // First, try inserting into the users table directly
        let userData;
        
        try {
          const { data: insertedUser, error: profileError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              role: 'lecturer',
              display_name: displayName,
              institution_code: institutionCode
            })
            .select()
            .single();
            
          if (profileError) {
            // If it's an RLS error, we need a different approach
            if (profileError.message && profileError.message.includes('violates row-level security policy')) {
              console.log('RLS error detected, using auth.updateUser as fallback');
              
              // Use auth.updateUser instead to add metadata
              await supabase.auth.updateUser({
                data: {
                  role: 'lecturer',
                  email: user.email,
                  display_name: displayName,
                  institution_code: institutionCode
                }
              });
              
              // Then try to get the user data from the auth API
              userData = {
                id: user.id,
                email: user.email!,
                role: 'lecturer',
                displayName: displayName,
                institutionCode: institutionCode
              };
            } else {
              throw profileError;
            }
          } else {
            userData = insertedUser;
          }
        } catch (insertError) {
          console.error('Profile creation error:', insertError);
          // If profile creation fails, delete the auth user
          await supabase.auth.signOut();
          throw insertError;
        }
        
        if (!userData) {
          await supabase.auth.signOut();
          return null;
        }
        
        console.log('User profile created successfully');
        
        return {
          id: userData.id,
          email: userData.email,
          displayName: userData.display_name ?? undefined,
          role: userData.role as UserRole || 'lecturer'
        };
      } catch (profileError) {
        console.error('Profile creation exception:', profileError);
        await supabase.auth.signOut();
        throw profileError;
      }
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Sign up a new student with index number
  async signUpStudent(
    indexNumber: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserData | null> {
    try {
      // Validate index number format
      if (!this.validateIndexNumber(indexNumber)) {
        throw new Error('Invalid index number format. Please use your official student ID.');
      }
      
      // Check if index number already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('index_number', indexNumber)
        .single();
        
      if (existingUser) {
        throw new Error('This index number is already registered.');
      }
      
      // Add a reasonable delay to handle rate limiting issues
      await sleep(2000);
      
      console.log('Creating auth user for student:', email);
      
      // Create the user in Supabase Auth
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        // Handle rate limiting specifically
        if (error.message && error.message.includes('security purposes')) {
          const waitTimeMatch = error.message.match(/after (\d+) seconds/);
          if (waitTimeMatch && waitTimeMatch[1]) {
            const waitTime = parseInt(waitTimeMatch[1]);
            throw new Error(`Please wait ${waitTime} seconds before trying again.`);
          } else {
            throw new Error('Please wait a moment before trying again.');
          }
        }
        
        // Handle user already registered error
        if (error.message && error.message.includes('already registered')) {
          // Try to sign in with these credentials instead
          console.log('User already exists, attempting to sign in instead');
          try {
            return await this.signIn(email, password);
          } catch (signInError) {
            // If sign in also fails, throw a more helpful error
            throw new Error('This email is already registered. Please use the login page or try a different email.');
          }
        }
        
        throw error;
      }
      
      if (!user) return null;
      
      console.log('Auth user created:', user.id);
      console.log('Inserting student profile data');
      
      // Create a profile in our profiles table
      try {
        // First, try inserting into the users table directly
        let userData;
        const displayNameToUse = displayName || indexNumber;
        
        try {
          const { data: insertedUser, error: profileError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              index_number: indexNumber,
              display_name: displayNameToUse, // Use index number as display name if not provided
              role: 'student'
            })
            .select()
            .single();
            
          if (profileError) {
            // If it's an RLS error, we need a different approach
            if (profileError.message && profileError.message.includes('violates row-level security policy')) {
              console.log('RLS error detected, using auth.updateUser as fallback');
              
              // Use auth.updateUser instead to add metadata
              await supabase.auth.updateUser({
                data: {
                  role: 'student',
                  email: user.email,
                  index_number: indexNumber,
                  display_name: displayNameToUse
                }
              });
              
              // Then try to get the user data from the auth API
              userData = {
                id: user.id,
                email: user.email!,
                role: 'student',
                indexNumber: indexNumber,
                displayName: displayNameToUse
              };
            } else {
              throw profileError;
            }
          } else {
            userData = insertedUser;
          }
        } catch (insertError) {
          console.error('Student profile creation error:', insertError);
          // If profile creation fails, delete the auth user
          await supabase.auth.signOut();
          throw insertError;
        }
        
        if (!userData) {
          await supabase.auth.signOut();
          return null;
        }
        
        console.log('Student profile created successfully');
        
        return {
          id: userData.id,
          email: userData.email,
          indexNumber: userData.index_number || indexNumber,
          displayName: userData.display_name ?? undefined,
          role: userData.role as UserRole || 'lecturer'
        };
      } catch (profileError) {
        console.error('Student profile creation exception:', profileError);
        await supabase.auth.signOut();
        throw profileError;
      }
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Validate institution code for lecturers
  validateInstitutionCode(code: string): boolean {
    // Check against our predefined list of valid codes
    return VALID_INSTITUTION_CODES.includes(code);
  },
  
  // Get a list of all valid institution codes - for administrative purposes
  getValidInstitutionCodes(): string[] {
    return [...VALID_INSTITUTION_CODES];
  },
  
  // Validate student index number format
  validateIndexNumber(indexNumber: string): boolean {
    // Don't accept empty strings
    if (!indexNumber || indexNumber.trim() === '') {
      return false;
    }
    
    // Don't accept values that look like email addresses
    if (indexNumber.includes('@')) {
      return false;
    }

    // Accept digits only (min 5 digits), or letters followed by digits
    return /^\d{5,}$/.test(indexNumber) || /^[A-Za-z]+\d+$/.test(indexNumber);
  },
  
  // Sign out
  async signOut(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      handleSupabaseError(error as Error);
      return false;
    }
  },
  
  // Resend confirmation email
  async resendConfirmationEmail(email: string): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      handleSupabaseError(error as Error);
      return false;
    }
  },
  
  // Check if user is signed in
  async isSignedIn(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      handleSupabaseError(error as Error);
      return false;
    }
  }
}; 