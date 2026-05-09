'use client'

import { useEffect, useState } from 'react'
import { supabase, Member } from '@/lib/supabase'
import Auth from '@/components/Auth'
import Dashboard from '@/components/Dashboard'
import WorkspaceSetup from '@/components/WorkspaceSetup'

export default function Home() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const getMemberOrCreate = async (user: any) => {
    let { data } = await supabase.from('members').select('*').eq('id', user.id).single()
    if (!data) {
      const { data: newMember } = await supabase.from('members').insert({
        id: user.id,
        name: user.user_metadata?.name || user.email,
        email: user.email,
        is_online: true,
        last_seen: new Date().toISOString()
      }).select().single()
      data = newMember
    } else {
      await supabase.from('members').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id)
    }
    return data
  }

  const getWorkspace = async (memberId: string) => {
    const { data } = await supabase
      .from('workspace_members')
      .select('*, workspaces(*)')
      .eq('member_id', memberId)
      .single()
    return data?.workspaces || null
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const member = await getMemberOrCreate(session.user)
        if (member) {
          setCurrentMember(member)
          const ws = await getWorkspace(member.id)
          setWorkspace(ws)
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const member = await getMemberOrCreate(session.user)
        if (member) {
          setCurrentMember(member)
          const ws = await getWorkspace(member.id)
          setWorkspace(ws)
        }
      } else {
        setCurrentMember(null)
        setWorkspace(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (currentMember) {
      await supabase.from('members').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', currentMember.id)
    }
    await supabase.auth.signOut()
    setCurrentMember(null)
    setWorkspace(null)
  }

  if (loading) return null
  if (!currentMember) return <Auth />
  if (!workspace) return <WorkspaceSetup currentMember={currentMember} onComplete={(ws) => setWorkspace(ws)} />
 return <Dashboard currentMember={currentMember} workspace={workspace} onLogout={handleLogout} />
}