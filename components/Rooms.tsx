'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CreateRoomModal from './CreateRoomModal'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const c = {
  bg: '#EEF2F7',
  card: '#FFFFFF',
  accent: '#3B82F6',
  text: '#0F172A',
  textMuted: '#475569',
  textLight: '#64748B',
  border: '#CBD5E1',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
}

export default function Rooms({ currentMember }: { currentMember: any }) {
  const router = useRouter()
  const [rooms, setRooms] = useState<any[]>([])
  const [myMemberships, setMyMemberships] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null)

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, room_members(id, user_id, role, status, members(name, email))')
      .order('created_at', { ascending: false })
    setRooms(data || [])

    const { data: myRooms } = await supabase
      .from('room_members')
      .select('room_id, role, status')
      .eq('user_id', currentMember.id)
    setMyMemberships(myRooms || [])
  }

  useEffect(() => {
    fetchRooms()
    const ch = supabase.channel(`rooms-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, fetchRooms)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const handleJoin = async (roomId: string) => {
    const { error } = await supabase.from('room_members').insert({
      room_id: roomId, user_id: currentMember.id, role: 'member', status: 'pending'
    })
    if (error && error.code !== '23505') console.error(error)
    await fetchRooms()
  }

  const handleLeave = async (roomId: string) => {
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', currentMember.id)
    await fetchRooms()
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('Delete this room?')) return
    await supabase.from('rooms').delete().eq('id', roomId)
    await fetchRooms()
  }

  const handleAdmit = async (memberId: string, roomId: string) => {
    await supabase.from('room_members').update({ status: 'member' }).eq('user_id', memberId).eq('room_id', roomId)
    await fetchRooms()
  }

  const handleRemove = async (memberId: string, roomId: string) => {
    await supabase.from('room_members').delete().eq('user_id', memberId).eq('room_id', roomId)
    await fetchRooms()
  }

  const handleGenerateInvite = async (roomId: string) => {
    const { data: tokenData } = await supabase
      .from('invite_tokens')
      .insert({ type: 'room', room_id: roomId, created_by: currentMember.id })
      .select('token').single()

    if (tokenData?.token) {
      const link = `${window.location.origin}/join/${tokenData.token}`
      await navigator.clipboard.writeText(link)
      setCopiedRoom(roomId)
      setTimeout(() => setCopiedRoom(null), 2500)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: c.text, letterSpacing: '-0.02em', fontFamily: FONT }}>Rooms</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: c.textMuted, fontFamily: FONT }}>{rooms.length} room{rooms.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: FONT, boxShadow: '0 2px 6px rgba(59,130,246,0.4)' }}>
          + New Room
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', background: c.card, borderRadius: 12, border: `1px solid ${c.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontFamily: FONT }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: c.text, fontWeight: 600 }}>No rooms yet</h3>
          <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Create a room to collaborate with your team.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {rooms.map((room: any) => {
            const myMembership = myMemberships.find(m => m.room_id === room.id)
            const isCreator = myMembership?.role === 'creator'
            const isMember = myMembership?.status === 'member' || isCreator
            const isPending = myMembership?.status === 'pending'
            const notJoined = !myMembership
            const allMembers = room.room_members || []
            const activeMembers = allMembers.filter((m: any) => m.status === 'member' || m.role === 'creator')
            const pendingMembers = allMembers.filter((m: any) => m.status === 'pending')
            const isExpanded = expandedRoom === room.id

            return (
              <div key={room.id} style={{ background: c.card, border: `1.5px solid ${isMember ? c.accent : c.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontFamily: FONT }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: c.text }}>{room.name}</h3>
                      {isCreator && <span style={{ fontSize: 11, background: '#EFF6FF', color: c.accent, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>CREATOR</span>}
                      {isMember && !isCreator && <span style={{ fontSize: 11, background: '#F0FDF4', color: c.success, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>MEMBER</span>}
                      {isPending && <span style={{ fontSize: 11, background: '#FFFBEB', color: c.warning, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>PENDING</span>}
                      {isCreator && pendingMembers.length > 0 && <span style={{ fontSize: 11, background: '#FEF2F2', color: c.danger, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{pendingMembers.length} request{pendingMembers.length !== 1 ? 's' : ''}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: c.textLight }}>{activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {isMember && (
                      <>
                        <button onClick={() => router.push(`/room/${room.id}`)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT, fontWeight: 600 }}>Enter</button>
                        <button onClick={() => window.open(`https://meet.jit.si/coworkdev-room-${room.jitsi_room_id}`, '_blank')} style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, color: c.accent, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Video</button>
                        {isCreator && <>
                          <button onClick={() => handleGenerateInvite(room.id)} style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, color: c.success, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>{copiedRoom === room.id ? '✓ Copied' : 'Invite'}</button>
                          <button onClick={() => setExpandedRoom(isExpanded ? null : room.id)} style={{ background: '#F8FAFC', border: `1px solid ${c.border}`, color: c.textMuted, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Manage</button>
                          <button onClick={() => handleDelete(room.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Delete</button>
                        </>}
                        {!isCreator && <button onClick={() => handleLeave(room.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Leave</button>}
                      </>
                    )}
                    {notJoined && <button onClick={() => handleJoin(room.id)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT, fontWeight: 500 }}>Request to Join</button>}
                    {isPending && <button disabled style={{ background: '#FFFBEB', border: `1px solid #FDE68A`, color: c.warning, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: 'not-allowed' }}>Awaiting Approval</button>}
                  </div>
                </div>

                {isExpanded && isCreator && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${c.border}` }}>
                    {pendingMembers.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: c.textLight, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>PENDING REQUESTS</div>
                        {pendingMembers.map((m: any) => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${c.border}` }}>
                            <span style={{ fontSize: 14, color: c.text, fontWeight: 500 }}>{m.members?.name || m.members?.email || 'Unknown'}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleAdmit(m.user_id, room.id)} style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, color: c.success, padding: '5px 12px', fontSize: 13, fontFamily: FONT, cursor: 'pointer', borderRadius: 6 }}>Admit</button>
                              <button onClick={() => handleRemove(m.user_id, room.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '5px 12px', fontSize: 13, fontFamily: FONT, cursor: 'pointer', borderRadius: 6 }}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 12, color: c.textLight, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>MEMBERS</div>
                      {activeMembers.length === 0 && <p style={{ color: c.textMuted, fontSize: 14, margin: 0 }}>No members yet.</p>}
                      {activeMembers.map((m: any) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${c.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, color: c.text, fontWeight: 500 }}>{m.members?.name || m.members?.email || 'Unknown'}</span>
                            {m.role === 'creator' && <span style={{ fontSize: 11, background: '#EFF6FF', color: c.accent, padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>CREATOR</span>}
                          </div>
                          {m.role !== 'creator' && (
                            <button onClick={() => handleRemove(m.user_id, room.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '5px 12px', fontSize: 13, fontFamily: FONT, cursor: 'pointer', borderRadius: 6 }}>Remove</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateRoomModal
          currentMember={currentMember}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchRooms() }}
        />
      )}
    </div>
  )
}
