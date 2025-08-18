import { getDashboardData } from '@/lib/analytics-dashboard'
import { isSupabaseEnabled } from '@/lib/supabase/config'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ActivitySection, FeaturesSection, ModelsSection, ToolsSection, QuickStats } from '@/components/analytics/sections'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { trackFeatureUsage } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

async function getUserId() {
  if (!isSupabaseEnabled) return null
  const sb = await createServerSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data.user?.id ?? null
}

export default async function DashboardPage() {
  if (!isSupabaseEnabled) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Supabase is not configured. Set environment variables to enable analytics.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const userId = await getUserId()
  if (!userId) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Sign in to view your metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/"> 
                <ArrowLeft className="mr-2 size-4" /> Back to chat
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Optional range from query (simple cookie fallback because this is a server component without searchParams here)
  const cookieStore = await cookies()
  const rangeStr = cookieStore.get('dashboard_range')?.value
  const range = rangeStr ? Number(rangeStr) : 30
  const rangeDays = [7, 30, 90].includes(range) ? range : 30
  const data = await getDashboardData(userId, rangeDays)
  // Record feature usage: dashboard view
  await trackFeatureUsage(userId, 'dashboard.view', { delta: 1 })

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-6 p-4">
      {/* subtle background accents */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="[mask-image:radial-gradient(300px_200px_at_top_left,black,transparent)] absolute -left-8 -top-8 h-64 w-64 rounded-full bg-primary/10" />
        <div className="[mask-image:radial-gradient(300px_200px_at_top_right,black,transparent)] absolute -right-8 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10" />
        <div className="[mask-image:radial-gradient(300px_200px_at_bottom_left,black,transparent)] absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-emerald-500/10" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="mr-2 size-4" /> Back home
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Your activity in Cleo over the last {data.rangeDays} days</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Simple range selector posts a cookie and reloads */}
          <form
            action={async (formData) => {
              'use server'
              const c = await cookies()
              const v = String(formData.get('range') ?? '30')
              c.set('dashboard_range', v, { path: '/', httpOnly: false })
              redirect('/dashboard')
            }}
          >
            <div className="inline-flex overflow-hidden rounded-md border">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  name="range"
                  value={d}
                  className={`px-3 py-1 text-sm transition-colors hover:bg-accent ${data.rangeDays === d ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      <QuickStats totals={data.totals} days={data.rangeDays} />

      {/* Main content in a responsive 2x2 grid on large screens */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.daily.length ? (
          <ActivitySection daily={data.daily} />
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No activity yet. Chat with Cleo to see metrics here.</CardContent>
          </Card>
        )}
        <ModelsSection modelUsage={data.modelUsage} />
        <FeaturesSection features={data.featureUsage} />
        <ToolsSection tools={data.toolUsage} />
      </div>
    </div>
  )
}
