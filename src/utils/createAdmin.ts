import { supabase } from '@/integrations/supabase/client';

export const createFirstAdmin = async (email: string, password: string, username: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-first-admin', {
      body: { email, password, username }
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};
