'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const FONT = "'Times New Roman', Times, serif"

export default function WorkspaceSetup({ currentMember, onComplete }: {
  currentMember: any
  onComplete: (workspace: any) => void
}) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!workspaceName.trim()) return setError('Workspace name is required')
    setLoading(true)
    setError('')

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: workspaceName.trim(), created_by: currentMember.id })
      .select()
      .single()

    if (wsError) { setError(wsError.message); setLoading(false); return }

    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      member_id: currentMember.id,
      role: 'creator'
    })

    setLoading(false)
    onComplete(workspace)
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return setError('Invite link is required')
    setLoading(true)
    setError('')

    // Extract token from full URL or just use as token
    const token = inviteCode.includes('/join/') 
      ? inviteCode.split('/join/')[1].trim()
      : inviteCode.trim()

    const { data: invite } = await supabase
      .from('invite_tokens')
      .select('*, workspaces(*)')
      .eq('token', token)
      .single()

    if (!invite) { setError('Invalid invite link'); setLoading(false); return }

    // Get workspace from token
    const workspaceId = invite.workspace_id || invite.room_id

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single()

    if (!workspace) { setError('Workspace not found'); setLoading(false); return }

    await supabase.from('workspace_members').upsert({
      workspace_id: workspace.id,
      member_id: currentMember.id,
      role: 'member'
    }, { onConflict: 'workspace_id,member_id' })

    setLoading(false)
    onComplete(workspace)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div style={{ position: 'relative', zIndex: 1, border: '1px solid #222', padding: '48px', width: '100%', maxWidth: 440, background: '#0a0a0a' }}>
        <div style={{ fontSize: 13, letterSpacing: '0.2em', color: '#555', marginBottom: 32, textAlign: 'center' }}>COWORK.DEV</div>

        {mode === 'choose' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: '#fff', textAlign: 'center' }}>Welcome, {currentMember.name}.</h2>
            <p style={{ margin: '0 0 36px', fontSize: 15, color: '#555', textAlign: 'center' }}>Get started by creating or joining a workspace.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => setMode('create')} style={{ width: '100%', background: '#fff', border: 'none', color: '#000', padding: '14px', fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: 'pointer' }}>
                + Create a workspace
              </button>
              <button onClick={() => setMode('join')} style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#fff', padding: '14px', fontSize: 17, fontFamily: FONT, cursor: 'pointer' }}>
                Join with invite link
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <h2 style={{ margin: '0 0 32px', fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: '#fff', textAlign: 'center' }}>Create workspace.</h2>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#555', letterSpacing: '0.1em', marginBottom: 8 }}>WORKSPACE NAME</div>
              <input
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. My Startup"
                style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#fff', padding: '12px 14px', fontSize: 16, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <div style={{ color: '#ff4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <button onClick={handleCreate} disabled={loading} style={{ width: '100%', background: '#fff', border: 'none', color: '#000', padding: '14px', fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', marginBottom: 12 }}>
              {loading ? 'creating...' : 'Create Workspace'}
            </button>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#666', padding: '12px', fontSize: 15, fontFamily: FONT, cursor: 'pointer' }}>
              ← back
            </button>
          </>
        )}

        {mode === 'join' && (
          <>
            <h2 style={{ margin: '0 0 32px', fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: '#fff', textAlign: 'center' }}>Join workspace.</h2>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#555', letterSpacing: '0.1em', marginBottom: 8 }}>INVITE LINK</div>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="Paste invite link here"
                style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#fff', padding: '12px 14px', fontSize: 16, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && <div style={{ color: '#ff4444', fontSize: 14, marginBottom: 16 }}>{error}</div>}
            <button onClick={handleJoin} disabled={loading} style={{ width: '100%', background: '#fff', border: 'none', color: '#000', padding: '14px', fontSize: 17, fontWeight: 700, fontFamily: FONT, cursor: 'pointer', marginBottom: 12 }}>
              {loading ? 'joining...' : 'Join Workspace'}
            </button>
            <button onClick={() => { setMode('choose'); setError('') }} style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#666', padding: '12px', fontSize: 15, fontFamily: FONT, cursor: 'pointer' }}>
              ← back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
