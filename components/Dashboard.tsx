'use client'

import { useEffect, useState } from 'react'
import { supabase, Member } from '@/lib/supabase'
import CreateProjectModal from './CreateProjectModal'
import FileManager from './FileManager'
import Rooms from './Rooms'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const c = {
  bg: '#EEF2F7',
  bgSecondary: '#E2E8F0',
  nav: '#1E293B',
  navText: '#F8FAFC',
  accent: '#3B82F6',
  text: '#0F172A',
  textMuted: '#475569',
  textLight: '#94A3B8',
  border: '#CBD5E1',
  card: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
}

export default function Dashboard({ currentMember, workspace, onLogout }: {
  currentMember: Member
  workspace: any
  onLogout: () => void
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'team' | 'rooms'>('projects')
  const [joinedProjects, setJoinedProjects] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileManagerProject, setFileManagerProject] = useState<any>(null)

  const fetchAll = async () => {
    const { data: wsMembersData } = await supabase
      .from('workspace_members')
      .select('*, members(*)')
      .eq('workspace_id', workspace.id)
    setMembers((wsMembersData?.map((wm: any) => wm.members).filter(Boolean) || []) as Member[])

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, project_members(member_id, members(name, email))')
      .is('room_id', null)
      .order('created_at', { ascending: false })
    setProjects(projectsData || [])

    const { data: myProjects } = await supabase
      .from('project_members').select('project_id').eq('member_id', currentMember.id)
    setJoinedProjects(new Set(myProjects?.map(p => p.project_id) || []))
  }

  useEffect(() => {
    fetchAll()
    const ch1 = supabase.channel(`ws-${workspace.id}-m`).on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, fetchAll).subscribe()
    const ch2 = supabase.channel(`ws-${workspace.id}-p`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  const handleJoinProject = async (projectId: string) => {
    if (joinedProjects.has(projectId)) return
    await supabase.from('project_members').insert({ project_id: projectId, member_id: currentMember.id })
    await fetchAll()
  }

  const handleLeaveProject = async (projectId: string) => {
    await supabase.from('project_members').delete().eq('project_id', projectId).eq('member_id', currentMember.id)
    await fetchAll()
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return
    setDeletingId(projectId)
    await supabase.from('projects').delete().eq('id', projectId)
    await fetchAll()
    setDeletingId(null)
  }

  const onlineMembers = members.filter(m => m.is_online)

  return (
    <div style={{ minHeight: '100vh', background: c.bg, fontFamily: FONT, color: c.text }}>

      {/* Nav */}
      <nav style={{ background: c.nav, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: c.accent, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>C</span>
            </div>
            <span style={{ color: c.navText, fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>cowork.dev</span>
            <span style={{ color: '#64748B', fontSize: 13 }}>/ {workspace.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['projects', 'team', 'rooms'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none', color: activeTab === tab ? c.white : '#94A3B8',
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                fontSize: 14, fontFamily: FONT, fontWeight: activeTab === tab ? 600 : 400,
                textTransform: 'capitalize', transition: 'all 0.15s'
              }}>{tab}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.success }} />
            <span style={{ color: '#94A3B8', fontSize: 13 }}>{onlineMembers.length} online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{currentMember.name.charAt(0).toUpperCase()}</span>
            </div>
            <span style={{ color: c.navText, fontSize: 14, fontWeight: 500 }}>{currentMember.name}</span>
          </div>
          <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94A3B8', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: FONT, transition: 'all 0.15s' }}>Sign out</button>
        </div>
      </nav>

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 32px' }}>

        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: c.text, letterSpacing: '-0.02em' }}>Projects</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: c.textMuted }}>{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
              </div>
              <button onClick={() => setShowCreate(true)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: FONT, boxShadow: '0 2px 6px rgba(59,130,246,0.4)' }}>
                + New Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', background: c.card, borderRadius: 12, border: `1px solid ${c.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, color: c.text, fontWeight: 600 }}>No projects yet</h3>
                <p style={{ margin: 0, fontSize: 14, color: c.textMuted }}>Create your first project to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {projects.map((project: any) => {
                  const isJoined = joinedProjects.has(project.id)
                  const memberCount = project.project_members?.length || 0
                  const isCreator = project.created_by === currentMember.id
                  const isDeleting = deletingId === project.id
                  return (
                    <div key={project.id} style={{ background: c.card, border: `1.5px solid ${isJoined ? c.accent : c.border}`, borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', opacity: isDeleting ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: c.text }}>{project.name}</h3>
                            {isCreator && <span style={{ fontSize: 11, background: '#EFF6FF', color: c.accent, padding: '2px 8px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.02em' }}>OWNER</span>}
                            {isJoined && !isCreator && <span style={{ fontSize: 11, background: '#F0FDF4', color: c.success, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>JOINED</span>}
                          </div>
                          {project.description && <p style={{ margin: '0 0 8px', fontSize: 13, color: c.textMuted, lineHeight: 1.5 }}>{project.description}</p>}
                          <div style={{ display: 'flex', gap: 14, fontSize: 13, color: c.textLight }}>
                            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                            <span>{new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => setFileManagerProject(project)} style={{ background: c.bgSecondary, border: `1px solid ${c.border}`, color: c.textMuted, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Files</button>
                          {!isJoined && <button onClick={() => handleJoinProject(project.id)} style={{ background: c.accent, border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT, fontWeight: 500 }}>Join</button>}
                          {isJoined && !isCreator && <button onClick={() => handleLeaveProject(project.id)} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Leave</button>}
                          {isCreator && <button onClick={() => handleDeleteProject(project.id)} disabled={isDeleting} style={{ background: '#FEF2F2', border: `1px solid #FECACA`, color: c.danger, padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: FONT }}>{isDeleting ? 'Deleting...' : 'Delete'}</button>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && <Rooms currentMember={currentMember} />}

        {activeTab === 'team' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: c.text, letterSpacing: '-0.02em' }}>Team</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: c.textMuted }}>{onlineMembers.length} of {members.length} online</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {members.map((member) => (
                <div key={member.id} style={{ background: c.card, border: `1.5px solid ${member.id === currentMember.id ? c.accent : c.border}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(59,130,246,0.3)' }}>
                        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{member.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: member.is_online ? c.success : c.border, border: `2px solid ${c.white}` }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: c.text }}>
                        {member.name}
                        {member.id === currentMember.id && <span style={{ color: c.textLight, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{member.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: member.is_online ? c.success : c.textLight, fontWeight: member.is_online ? 600 : 400 }}>
                    {member.is_online ? '● Online' : `Last seen ${new Date(member.last_seen).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreate && <CreateProjectModal currentMember={currentMember} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchAll() }} />}
      {fileManagerProject && <FileManager projectId={fileManagerProject.id} projectName={fileManagerProject.name} currentMember={currentMember} onClose={() => setFileManagerProject(null)} />}
    </div>
  )
}
