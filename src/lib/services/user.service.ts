import { supabase, handleSupabaseError } from '@/lib/supabase';
import type { UserData } from '@/lib/types';

export const userService = {
  // Get user data by ID
  async getUserById(id: string): Promise<UserData | null> {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return null;
      }
      
      if (!userData) {
        return null;
      }
      
      return {
        id: userData.id,
        email: userData.email,
        indexNumber: userData.index_number || undefined,
        displayName: userData.display_name || undefined,
        role: userData.role
      };
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  }
}; 