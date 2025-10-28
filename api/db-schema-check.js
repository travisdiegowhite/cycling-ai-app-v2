// Diagnostic API: Check actual routes table schema in Supabase
// This helps us verify what columns actually exist in production

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Simple security - only allow in development or with auth
  const isDev = process.env.NODE_ENV !== 'production';
  const hasAuth = req.headers.authorization === `Bearer ${process.env.SUPABASE_SERVICE_KEY}`;

  if (!isDev && !hasAuth) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Query information_schema to get actual table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'routes' })
      .catch(async () => {
        // Fallback: try to insert a test row with minimal fields to see what's required
        const testData = {
          user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
          name: 'DIAGNOSTIC_TEST_DELETE_ME'
        };

        const { error } = await supabase
          .from('routes')
          .insert(testData);

        return { data: null, error };
      });

    // Try a simple select to see what columns exist
    const { data: sampleRow, error: selectError } = await supabase
      .from('routes')
      .select('*')
      .limit(1);

    // Get CHECK constraints info
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_check_constraints', { table_name: 'routes' })
      .catch(() => ({ data: null, error: null }));

    // Return diagnostic information
    return res.status(200).json({
      success: true,
      diagnostics: {
        sampleRowColumns: sampleRow && sampleRow.length > 0 ? Object.keys(sampleRow[0]) : [],
        sampleRow: sampleRow && sampleRow.length > 0 ? sampleRow[0] : null,
        tableColumns: columns,
        constraints: constraints,
        errors: {
          columnsError,
          selectError,
          constraintsError
        }
      }
    });

  } catch (error) {
    console.error('Schema check error:', error);
    return res.status(500).json({
      error: 'Schema check failed',
      message: error.message
    });
  }
}
