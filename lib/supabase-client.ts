// lib/supabase-client.ts
// Centralized Supabase client configuration with singleton pattern

import { createClient } from '@supabase/supabase-js';

// Create a single Supabase client instance to be reused across the app
// This prevents "Multiple GoTrueClient instances" warnings
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
}

// Helper function to check if user is authenticated
export async function checkAuthentication() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Helper function to get current user's properties
export async function getUserProperties() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return properties || [];
}

// Helper function to get user's profile
export async function getUserProfile() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

// Helper function to get AI insights
export async function getUserInsights() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data: insights, error } = await supabase
    .from('market_insights')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching insights:', error);
    return [];
  }

  return insights || [];
}
