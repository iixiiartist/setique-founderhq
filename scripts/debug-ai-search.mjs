import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const main = async () => {
  const { data, error } = await client.functions.invoke('ai-search', {
    body: {
      query: 'Key stats for FounderHQ 2025',
      mode: 'search',
    },
  });

  console.log('data:', JSON.stringify(data, null, 2));
  if (error) {
    let errorBody = null;
    if (error.context) {
      try {
        errorBody = await error.context.clone().json();
      } catch (jsonErr) {
        try {
          errorBody = await error.context.clone().text();
        } catch (textErr) {
          errorBody = `Unable to read body: ${textErr.message}`;
        }
      }
    }
    console.log('error:', error.message);
    console.log('error body:', errorBody);
  } else {
    console.log('error: null');
  }
};

main().catch((err) => {
  console.error('invoke failed', err);
  process.exit(1);
});
