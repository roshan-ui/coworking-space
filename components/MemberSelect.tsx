'use client'

import { useEffect, useState } from 'react'
import { supabase, Member } from '@/lib/supabase'

const AVATARS = ['🧑‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '🧑‍🚀']
const FONT = "'Times New Roman', Times, serif"

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
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      color: '#ffffff'
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 620, padding: '0 24px' }}>
        <div style={{ fontSize: 14, letterSpacing: 6, color: '#ffffff', marginBottom: 18, textTransform: 'uppercase', fontStyle: 'italic' }}>
          cowork.dev
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 700, margin: '0 0 10px', fontStyle: 'italic' }}>
          Who are you?
        </h1>
        <p style={{ color: '#666', fontSize: 17, marginBottom: 48 }}>
          Select your member profile to enter the workspace
        </p>

        {loading ? (
          <p style={{ color: '#444', fontSize: 17 }}>Loading members...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {members.map((member, i) => (
              <button
                key={member.id}
                onClick={() => onSelect(member)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '24px 20px',
                  cursor: 'pointer',
                  color: '#ffffff',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontFamily: FONT
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: 34 }}>{AVATARS[i]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{member.name}</div>
                  <div style={{ fontSize: 14, color: '#555', marginTop: 4 }}>{member.email}</div>
                  {member.is_online && (
                    <div style={{ fontSize: 13, color: '#aaaaaa', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
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
