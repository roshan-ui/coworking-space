'use client'

import { useState } from 'react'
import { supabase, Member } from '@/lib/supabase'

function generateMeetLink() {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const segment = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`
}

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
  const [driveLink, setDriveLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    setError('')

    const meetLink = generateMeetLink()

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        drive_link: driveLink.trim() || null,
        meet_link: meetLink,
        created_by: currentMember.id
      })
      .select()
      .single()

    if (projectError) {
      setError('Failed to create project. Try again.')
      setLoading(false)
      return
    }

    // Auto-join creator to project
    await supabase.from('project_members').insert({
      project_id: project.id,
      member_id: currentMember.id
    })

    setLoading(false)
    onCreated()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0f0f18',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 32,
        width: '100%',
        maxWidth: 480,
        fontFamily: "'Courier New', monospace"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#e0e0e0' }}>new project</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#555',
            fontSize: 20, cursor: 'pointer', lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Project Name *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-awesome-project"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '10px 14px', color: '#e0e0e0', fontSize: 14,
                fontFamily: "'Courier New', monospace", outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this project about?"
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '10px 14px', color: '#e0e0e0', fontSize: 14,
                fontFamily: "'Courier New', monospace", outline: 'none',
                resize: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Google Drive Link
            </label>
            <input
              value={driveLink}
              onChange={e => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '10px 14px', color: '#e0e0e0', fontSize: 14,
                fontFamily: "'Courier New', monospace", outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#444' }}>
              Share a Google Drive folder where project files will live
            </p>
          </div>

          <div style={{ padding: '12px 14px', background: 'rgba(0,255,180,0.04)', border: '1px solid rgba(0,255,180,0.1)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#00ffb4' }}>
              📹 A Google Meet link will be auto-generated for this project
            </p>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#ff6464' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#555', padding: '10px', borderRadius: 8,
              cursor: 'pointer', fontSize: 13,
              fontFamily: "'Courier New', monospace"
            }}>
              cancel
            </button>
            <button onClick={handleCreate} disabled={loading} style={{
              flex: 2, background: loading ? '#00b37e' : '#00ffb4',
              border: 'none', color: '#0a0a0f',
              padding: '10px', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
              fontFamily: "'Courier New', monospace"
            }}>
              {loading ? 'creating...' : 'create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
