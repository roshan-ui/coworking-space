'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CreateProjectModal from '@/components/CreateProjectModal'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const c = {
  bg: '#EEF2F7',
  card: '#FFFFFF',
  nav: '#1E293B',
  accent: '#3B82F6',
  text: '#0F172A',
  textMuted: '#475569',
  textLight: '#64748B',
  border: '#CBD5E1',
  danger: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
  chatBg: '#F8FAFC',
}

export default function RoomPage() {
  const { id } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [currentMember, setCurrentMember] = useState<any>(null)
  const [membership, setMembership] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [joinedProjects, setJoinedProjects] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<any>(null)

  useEffect(() => {
  const stored = localStorage.getItem('currentMember')
  if (stored) {
    setCurrentMember(JSON.parse(stored))
  } else {
    // fallback to auth user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('members').select('*').eq('id', user.id).single()
        if (data) {
          setCurrentMember(data)
          localStorage.setItem('currentMember', JSON.stringify(data))
        }
      }
    })
  }
}, [])

  const fetchRoom = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, room_members(id, user_id, role, status)')
      .eq('id', id).single()
    setRoom(data)
  }

  const fetchProjects = async () => {
    if (!currentMember) return
    const { data } = await supabase
      .from('projects')
      .select('*, project_members(member_id)')
      .eq('room_id', id)
      .order('created_at', { ascending: false })
    setProjects(data || [])
    const { data: myProjects } = await supabase
      .from('project_members').select('project_id').eq('member_id', currentMember.id)
    setJoinedProjects(new Set(myProjects?.map((p: any) => p.project_id) || []))
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages').select('*').eq('room_id', id).order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  useEffect(() => { if (!id) return; fetchRoom() }, [id])

  useEffect(() => {
    if (!currentMember || !id) return
    fetchProjects()
    fetchMessages()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('room_members').select('role, status')
        .eq('room_id', id).eq('user_id', user.id).single()
        .then(({ data }) => setMembership(data))
    })

    const ch = supabase.channel(`room-page-${id}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `room_id=eq.${id}` }, fetchProjects)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentMember, id])

  const handleSendMessage = async () => {
  console.log('sending', newMessage, currentMember)
  if (!newMessage.trim() || !currentMember || sending) return
  setSending(true)
  const { error } = await supabase.from('messages').insert({ room_id: id, user_id: currentMember.id, content: newMessage.trim() })
  console.log('result', error)
  setNewMessage('')
  setSending(false)
}

  const handleJoinProject = async (projectId: string) => {
    if (!currentMember) return
    await supabase.from('project_members').insert({ project_id: projectId, member_id: currentMember.id })
    await fetchProjects()
  }

  const handleLeaveProject = async (projectId: string) => {
    if (!currentMember) return
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('member_id', currentMember.id)
    await fetchProjects()
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return
    await supabase.from('projects').delete().eq('id', projectId)
    await fetchProjects()
  }

  if (!room) return (
    <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text, fontFamily: FONT }}>
      <div style={{ fontSize: 14, color: c.textMuted }}>Loading...</div>
    </div>
  )

  const isCreator = membership?.role === 'creator'

  return (
    <div style={{ height: '100vh', background: c.bg, fontFamily: FONT, color: c.text, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ background: c.nav, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => router.push('/')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 14, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: c.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>C</span>
            </div>
            <span style={{ color: '#94A3B8', fontSize: 14 }}>cowork.dev</span>
            <span style={{ color: '#475569', fontSize: 14 }}>/</span>
            <span style={{ color: '#F8FAFC', fontSize: 15, fontWeight: 600 }}>{room.name}</span>
            {isCreator && <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.2)', color: '#93C5FD', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>CREATOR</span>}
          </div>
        </div>
        <button
          onClick={() => window.open(`https://meet.jit.si/coworkdev-room-${room.jitsi_room_id}`, '_blank')}
          style={{ background: c.accent, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', boxShadow: '0 2px 6px rgba(59,130,246,0.4)' }}
        >
          Video Call
        </button>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Projects */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text, letterSpacing: '-0.02em' }}>Projects</h2>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: c.textMuted }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
              </div>
              {currentMember && (
                <button onClick={() => setShowCreate(true)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT, boxShadow: '0 2px 6px rgba(59,130,246,0.35)' }}>+ New Project</button>
              )}
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', background: c.card, borderRadius: 12, border: `1px solid ${c.border}` }}>
                <p style={{ margin: 0, fontSize: 15, color: c.textMuted }}>No projects yet. Create one to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {projects.map((project: any) => {
                  const isJoined = joinedProjects.has(project.id)
                  const memberCount = project.project_members?.length || 0
                  const isProjectCreator = project.created_by === currentMember?.id
                  return (
                    <div key={project.id} style={{ background: c.card, border: `1.5px solid ${isJoined ? c.accent : c.border}`, borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>{project.name}</h3>
                            {isProjectCreator && <span style={{ fontSize: 11, background: '#EFF6FF', color: c.accent, padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>OWNER</span>}
                          </div>
                          <div style={{ fontSize: 12, color: c.textLight }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {!isJoined && <button onClick={() => handleJoinProject(project.id)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: FONT, fontWeight: 500 }}>Join</button>}
                          {isJoined && !isProjectCreator && <button onClick={() => handleLeaveProject(project.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Leave</button>}
                          {isProjectCreator && <button onClick={() => handleDeleteProject(project.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Delete</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div style={{ width: 320, borderLeft: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', background: c.chatBg }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, fontSize: 12, fontWeight: 600, color: c.textLight, letterSpacing: '0.06em' }}>ROOM CHAT</div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: c.textLight, fontSize: 13, textAlign: 'center', marginTop: 40 }}>No messages yet.</div>
            )}
            {messages.map((msg: any) => {
              const isMe = msg.user_id === currentMember?.id
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: 11, color: c.textLight, marginBottom: 3, fontWeight: 500 }}>{isMe ? 'You' : 'Member'}</div>
                  <div style={{ background: isMe ? c.accent : c.white, border: isMe ? 'none' : `1px solid ${c.border}`, color: isMe ? '#fff' : c.text, padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', fontSize: 13, maxWidth: '85%', lineHeight: 1.5, wordBreak: 'break-word', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: c.textLight, marginTop: 3 }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 8 }}>
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type a message..."
              style={{ flex: 1, background: c.white, border: `1.5px solid ${c.border}`, color: c.text, padding: '8px 12px', fontSize: 13, fontFamily: FONT, outline: 'none', borderRadius: 8 }}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              style={{ background: c.accent, border: 'none', color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 600, fontFamily: FONT, cursor: 'pointer', borderRadius: 8, opacity: !newMessage.trim() ? 0.4 : 1 }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {showCreate && currentMember && (
        <CreateProjectModal
          currentMember={currentMember}
          roomId={id as string}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchProjects() }}
        />
      )}
    </div>
  )
}
