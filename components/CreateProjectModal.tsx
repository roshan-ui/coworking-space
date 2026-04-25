'use client'

import { useState } from 'react'
import { supabase, Member } from '@/lib/supabase'

const FONT = "'Times New Roman', Times, serif"

export default function CreateProjectModal({
  currentMember,
  onClose,
  onCreated
}: {
  currentMember: Member
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    setError('')

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        drive_link: null,
        meet_link: 'https://meet.jit.si/placeholder',
        created_by: currentMember.id
      })
      .select()
      .single()

    if (projectError) {
      setError('Failed to create project. Try again.')
      setLoading(false)
      return
    }

    await supabase.from('project_members').insert({
      project_id: project.id,
      member_id: currentMember.id
    })

    setLoading(false)
    onCreated()
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: 16,
    fontFamily: FONT,
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  const labelStyle = {
    fontSize: 12,
    color: '#555',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: 8,
    fontFamily: FONT
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '32px',
        width: '100%',
        maxWidth: 480,
        fontFamily: FONT
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
          <h2 style={{ margin: 0, fontSize: 24, color: '#ffffff', fontStyle: 'italic', fontWeight: 700 }}>New Project</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#555',
            fontSize: 22, cursor: 'pointer', lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Project Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-awesome-project"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div style={{
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8
          }}>
            <p style={{ margin: 0, fontSize: 15, color: '#888', fontFamily: FONT }}>
              📁 Files can be uploaded directly inside the project after creation
            </p>
          </div>

          {error && <p style={{ margin: 0, fontSize: 15, color: '#ff4444', fontFamily: FONT }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#666', padding: '12px', borderRadius: 6,
              cursor: 'pointer', fontSize: 16, fontFamily: FONT
            }}>Cancel</button>
            <button onClick={handleCreate} disabled={loading} style={{
              flex: 2,
              background: loading ? '#555' : '#ffffff',
              border: 'none', color: '#000000',
              padding: '12px', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16, fontWeight: 700, fontFamily: FONT
            }}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
