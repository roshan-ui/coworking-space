'use client'

import { useEffect, useState } from 'react'
import { supabase, Member, Project } from '@/lib/supabase'
import CreateProjectModal from './CreateProjectModal'

const AVATARS = ['🧑‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '🧑‍🚀']

export default function Dashboard({
  currentMember,
  onLogout
}: {
  currentMember: Member
  onLogout: () => void
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'team'>('projects')
  const [joinedProjects, setJoinedProjects] = useState<Set<string>>(new Set())

  const fetchAll = async () => {
    const { data: membersData } = await supabase.from('members').select('*').order('name')
    setMembers(membersData || [])

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, project_members(member_id, members(name, email))')
      .order('created_at', { ascending: false })
    setProjects((projectsData as any) || [])

    // Check which projects current member has joined
    const { data: myProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('member_id', currentMember.id)
    setJoinedProjects(new Set(myProjects?.map(p => p.project_id) || []))
  }

  useEffect(() => {
    fetchAll()

    // Realtime: members presence
    const memberChannel = supabase
      .channel('members-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchAll)
      .subscribe()

    // Realtime: projects
    const projectChannel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(memberChannel)
      supabase.removeChannel(projectChannel)
    }
  }, [])

  const handleJoinProject = async (projectId: string) => {
    if (joinedProjects.has(projectId)) return
    await supabase.from('project_members').insert({
      project_id: projectId,
      member_id: currentMember.id
    })
    await fetchAll()
  }

  const handleLeaveProject = async (projectId: string) => {
    await supabase.from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('member_id', currentMember.id)
    await fetchAll()
  }

  const onlineMembers = members.filter(m => m.is_online)
  const myIndex = members.findIndex(m => m.id === currentMember.id)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: "'Courier New', monospace",
      color: '#e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Grid BG */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,180,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,180,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 1,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10,10,15,0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: 4, color: '#00ffb4', textTransform: 'uppercase' }}>
            cowork.dev
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['projects', 'team'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? 'rgba(0,255,180,0.08)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(0,255,180,0.2)' : '1px solid transparent',
                color: activeTab === tab ? '#00ffb4' : '#555',
                padding: '6px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: "'Courier New', monospace",
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Online indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {onlineMembers.slice(0, 5).map((m, i) => {
                const idx = members.findIndex(mem => mem.id === m.id)
                return (
                  <div key={m.id} title={m.name} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,255,180,0.15)',
                    border: '2px solid #0a0a0f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, marginLeft: i > 0 ? -8 : 0,
                    zIndex: 5 - i
                  }}>
                    {AVATARS[idx] || '🧑‍💻'}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 12, color: '#00ffb4' }}>
              {onlineMembers.length} online
            </span>
          </div>

          {/* Current user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 16 }}>{AVATARS[myIndex] || '🧑‍💻'}</span>
            <span style={{ fontSize: 13 }}>{currentMember.name}</span>
          </div>

          <button onClick={onLogout} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#555',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
            leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '40px 32px', maxWidth: 900, margin: '0 auto', width: '100%' }}>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Projects</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowCreate(true)} style={{
                background: '#00ffb4',
                border: 'none',
                color: '#0a0a0f',
                padding: '10px 20px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Courier New', monospace",
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#00e6a1'}
              onMouseLeave={e => e.currentTarget.style.background = '#00ffb4'}>
                + new project
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📂</div>
                <p style={{ margin: 0 }}>No projects yet. Create one to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {projects.map((project: any) => {
                  const isJoined = joinedProjects.has(project.id)
                  const memberCount = project.project_members?.length || 0
                  const isCreator = project.created_by === currentMember.id

                  return (
                    <div key={project.id} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isJoined ? 'rgba(0,255,180,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 12,
                      padding: '24px',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{project.name}</h3>
                            {isCreator && (
                              <span style={{ fontSize: 10, background: 'rgba(0,255,180,0.1)', color: '#00ffb4', padding: '2px 8px', borderRadius: 4, letterSpacing: 1 }}>
                                OWNER
                              </span>
                            )}
                            {isJoined && !isCreator && (
                              <span style={{ fontSize: 10, background: 'rgba(100,100,255,0.1)', color: '#8888ff', padding: '2px 8px', borderRadius: 4, letterSpacing: 1 }}>
                                JOINED
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                              {project.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#555' }}>
                            <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                            <span>🕒 {new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                          {/* Google Meet */}
                          <a href={project.meet_link} target="_blank" rel="noreferrer" style={{
                            background: 'rgba(0,255,180,0.08)',
                            border: '1px solid rgba(0,255,180,0.2)',
                            color: '#00ffb4',
                            padding: '8px 14px',
                            borderRadius: 8,
                            fontSize: 12,
                            textDecoration: 'none',
                            textAlign: 'center',
                            fontFamily: "'Courier New', monospace",
                            transition: 'all 0.2s',
                            display: 'block'
                          }}>
                            📹 join meet
                          </a>

                          {/* Drive link */}
                          {project.drive_link && (
                            <a href={project.drive_link} target="_blank" rel="noreferrer" style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: '#aaa',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 12,
                              textDecoration: 'none',
                              textAlign: 'center',
                              fontFamily: "'Courier New', monospace",
                              display: 'block'
                            }}>
                              📁 files
                            </a>
                          )}

                          {/* Join / Leave */}
                          {!isJoined ? (
                            <button onClick={() => handleJoinProject(project.id)} style={{
                              background: 'rgba(136,136,255,0.08)',
                              border: '1px solid rgba(136,136,255,0.2)',
                              color: '#8888ff',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 12,
                              cursor: 'pointer',
                              fontFamily: "'Courier New', monospace",
                              transition: 'all 0.2s'
                            }}>
                              + join project
                            </button>
                          ) : !isCreator ? (
                            <button onClick={() => handleLeaveProject(project.id)} style={{
                              background: 'transparent',
                              border: '1px solid rgba(255,100,100,0.2)',
                              color: '#ff6464',
                              padding: '8px 14px',
                              borderRadius: 8,
                              fontSize: 12,
                              cursor: 'pointer',
                              fontFamily: "'Courier New', monospace"
                            }}>
                              leave
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Team</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#555' }}>{onlineMembers.length} of {members.length} online</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map((member, i) => (
                <div key={member.id} style={{
                  background: member.id === currentMember.id ? 'rgba(0,255,180,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${member.id === currentMember.id ? 'rgba(0,255,180,0.12)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 28 }}>{AVATARS[i]}</div>
                      <div style={{
                        position: 'absolute', bottom: 0, right: -2,
                        width: 10, height: 10, borderRadius: '50%',
                        background: member.is_online ? '#00ffb4' : '#333',
                        border: '2px solid #0a0a0f'
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {member.name}
                        {member.id === currentMember.id && <span style={{ color: '#555', fontWeight: 400, fontSize: 12, marginLeft: 8 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{member.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: member.is_online ? '#00ffb4' : '#444' }}>
                    {member.is_online ? '● online' : `last seen ${new Date(member.last_seen).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          currentMember={currentMember}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchAll() }}
        />
      )}
    </div>
  )
}
