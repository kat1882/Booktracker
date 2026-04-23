import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SettingsView from './SettingsView'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('username, display_name, bio, country, public_portfolio, show_market_value')
    .eq('id', user.id)
    .single()

  return (
    <SettingsView
      email={user.email ?? ''}
      username={profile?.username ?? user.email!.split('@')[0]}
      displayName={profile?.display_name ?? ''}
      bio={profile?.bio ?? ''}
      country={profile?.country ?? ''}
      publicPortfolio={profile?.public_portfolio ?? true}
      showMarketValue={profile?.show_market_value ?? true}
    />
  )
}
