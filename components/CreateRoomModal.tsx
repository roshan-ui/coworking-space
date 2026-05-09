'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Times New Roman', Times, serif"

export default function CreateRoomModal({ currentMember, onClose, onCreated }: {
  currentMember: any
  onClose: () => void
  onCreated: () => void
}) {
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!roomName.trim()) return setError('Room name is required')
    setCreating(true)
    setError('')

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ name: roomName, created_by: currentMember.id, is_public: true })
        .select()
        .single()

      if (roomError) throw roomError

      // Add creator with role and status = 'creator'
      await supabase.from('room_members').upsert({
        room_id: room.id,
        user_id: currentMember.id,
        role: 'creator',
        status: 'creator'
      }, { onConflict: 'room_id,user_id' })

      // Generate invite token
      const { data: tokenData } = await supabase
        .from('invite_tokens')
        .insert({ type: 'room', room_id: room.id, created_by: currentMember.id })
        .select('token')
        .single()

      if (tokenData?.token) {
        setInviteLink(`${window.location.origin}/join/${tokenData.token}`)
      } else {
        onCreated()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '40px', width: '100%', maxWidth: 480, position: 'relative' }}>
        <button onClick={inviteLink ? onCreated : onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'transparent', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>✕</button>

        {!inviteLink ? (
          <>
            <div style={{ fontSize: 13, letterSpacing: '0.15em', color: '#555', marginBottom: 24 }}>CREATE ROOM</div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8, letterSpacing: '0.08em' }}>ROOM NAME</div>
              <input
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Design Sprint"
                style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#fff', padding: '10px 14px', fontSize: 16, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <div style={{ color: '#ff4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <button onClick={handleCreate} disabled={creating} style={{ width: '100%', background: '#fff', border: 'none', color: '#000', padding: '14px', fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'creating...' : 'Create Room'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, letterSpacing: '0.15em', color: '#555', marginBottom: 24 }}>ROOM CREATED ✓</div>
            <p style={{ color: '#888', fontSize: 15, marginBottom: 20 }}>Share this link to invite people:</p>
            <div style={{ background: '#111', border: '1px solid #333', padding: '12px 14px', fontSize: 13, color: '#aaa', wordBreak: 'break-all', marginBottom: 16, fontFamily: 'monospace' }}>
              {inviteLink}
            </div>
            <button onClick={handleCopy} style={{ width: '100%', background: '#fff', border: 'none', color: '#000', padding: '14px', fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', marginBottom: 12 }}>
              {copied ? '✓ Copied!' : 'Copy Invite Link'}
            </button>
            <button onClick={onCreated} style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#888', padding: '12px', fontSize: 15, fontFamily: FONT, cursor: 'pointer' }}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}