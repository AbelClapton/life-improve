import { createClientServer } from '@/lib/supabase-server'
import { User } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'

type AuthHandler<Args extends unknown[], R> = (
  user: User,
  supabase: SupabaseClient,
  ...args: Args
) => Promise<R>

export async function withUser<Args extends unknown[], R>(
  handler: AuthHandler<Args, R>,
  ...args: Args
): Promise<R | { error: 'unauthorized' }> {
  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'unauthorized' }
  }

  return handler(user, supabase, ...args)
}
