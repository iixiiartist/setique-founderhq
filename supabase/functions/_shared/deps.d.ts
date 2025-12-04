/**
 * Type declarations for Deno URL imports
 * This file suppresses TypeScript errors in VS Code for Deno Edge Functions
 */

// Supabase client
declare module 'https://esm.sh/@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js';
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

// Zod validation
declare module 'https://esm.sh/zod@3.22.4' {
  export * from 'zod';
}

declare module 'https://esm.sh/zod@3' {
  export * from 'zod';
}

// Deno std library
declare module 'https://deno.land/std@0.208.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

// Deno namespace for Edge Functions
declare namespace Deno {
  export function env: {
    get(key: string): string | undefined;
  };
}
