'use client'

import { useEffect, useState } from 'react'
import { supabase, Member, Project } from '@/lib/supabase'
import MemberSelect from '@/components/MemberSelect'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null)

  // Mark member offline on tab close
  useEffect(() => {
    if (!currentMember) return

    const handleUnload = async () => {
      await supabase
        .from('members')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', currentMember.id)
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [currentMember])

  const handleSelectMember = async (member: Member) => {
    // Mark as online
    await supabase
      .from('members')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', member.id)

    setCurrentMember({ ...member, is_online: true })
  }

  const handleLogout = async () => {
    if (!currentMember) return
    await supabase
      .from('members')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', currentMember.id)
    setCurrentMember(null)
  }

  if (!currentMember) {
    return <MemberSelect onSelect={handleSelectMember} />
  }

  return <Dashboard currentMember={currentMember} onLogout={handleLogout} />
}
