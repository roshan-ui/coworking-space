'use client'

import { useEffect, useState } from 'react'
import { supabase, Member } from '@/lib/supabase'

const AVATARS = ['🧑‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '🧑‍🚀']

export default function MemberSelect({ onSelect }: { onSelect: (m: Member) => void }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from('members').select('*').order('name')
      setMembers(data || [])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Courier New', monospace",
      color: '#e0e0e0'
    }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,180,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,180,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 600, padding: '0 24px' }}>
        <div style={{ fontSize: 13, letterSpacing: 6, color: '#00ffb4', marginBottom: 16, textTransform: 'uppercase' }}>
          cowork.dev
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 8px', letterSpacing: -1 }}>
          Who are you?
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 48 }}>
          Select your member profile to enter the workspace
        </p>

        {loading ? (
          <p style={{ color: '#444' }}>Loading members...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {members.map((member, i) => (
              <button
                key={member.id}
                onClick={() => onSelect(member)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '24px 20px',
                  cursor: 'pointer',
                  color: '#e0e0e0',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontFamily: "'Courier New', monospace"
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(0,255,180,0.06)'
                  el.style.borderColor = 'rgba(0,255,180,0.3)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.03)'
                  el.style.borderColor = 'rgba(255,255,255,0.08)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: 32 }}>{AVATARS[i]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{member.email}</div>
                  {member.is_online && (
                    <div style={{ fontSize: 11, color: '#00ffb4', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffb4', display: 'inline-block' }} />
                      online
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
