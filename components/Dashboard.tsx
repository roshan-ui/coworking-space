'use client'

import { useEffect, useState } from 'react'
import { supabase, Member, Project } from '@/lib/supabase'
import CreateProjectModal from './CreateProjectModal'
import MeetingNotification from './MeetingNotification'

const AVATARS = ['🧑‍💻', '👩‍💻', '🧑‍🎨', '👨‍🎨', '🧑‍🚀']
const FONT = "'Times New Roman', Times, serif"

function generateJitsiRoom() {
  const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet']
  const pick = () => words[Math.floor(Math.random() * words.length)]
  return `https://meet.jit.si/coworkdev-${pick()}-${pick()}-${Math.floor(Math.random() * 9000) + 1000}`
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeMeeting, setActiveMeeting] = useState<any>(null)
  const [myMeeting, setMyMeeting] = useState<any>(null)
  const [notification, setNotification] = useState<any>(null)

  const fetchAll = async () => {
    const { data: membersData } = await supabase.from('members').select('*').order('name')
    setMembers(membersData || [])

    const { data: projectsData } = await supabase
      .from('projects')
      .select('*, project_members(member_id, members(name, email))')
      .order('created_at', { ascending: false })
    setProjects((projectsData as any) || [])

    const { data: myProjects } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('member_id', currentMember.id)
    setJoinedProjects(new Set(myProjects?.map(p => p.project_id) || []))

    // Check for active meetings
    const { data: meetings } = await supabase
      .from('meetings')
      .select('*, members(name)')
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)

    if (meetings && meetings.length > 0) {
      setActiveMeeting(meetings[0])
      // Check if this meeting was started by current user
      if (meetings[0].started_by === currentMember.id) {
        setMyMeeting(meetings[0])
      }
    } else {
      setActiveMeeting(null)
      setMyMeeting(null)
    }
  }

  useEffect(() => {
    fetchAll()

    const memberChannel = supabase
      .channel('members-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, fetchAll)
      .subscribe()

    const projectChannel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, fetchAll)
      .subscribe()

    // Realtime meeting notifications
    const meetingChannel = supabase
      .channel('meetings-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' }, async (payload) => {
        const newMeeting = payload.new as any
        if (newMeeting.started_by !== currentMember.id) {
          // Get the member name
          const { data: member } = await supabase
            .from('members')
            .select('name')
            .eq('id', newMeeting.started_by)
            .single()
          setNotification({
            meetingStartedBy: member?.name || 'Someone',
            roomUrl: newMeeting.room_url,
            meetingId: newMeeting.id
          })
        }
        fetchAll()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(memberChannel)
      supabase.removeChannel(projectChannel)
      supabase.removeChannel(meetingChannel)
    }
  }, [])

  const handleStartMeeting = async () => {
    const roomUrl = generateJitsiRoom()
    const { data } = await supabase.from('meetings').insert({
      started_by: currentMember.id,
      room_url: roomUrl,
      is_active: true
    }).select().single()
    setMyMeeting(data)
    window.open(roomUrl, '_blank')
  }

  const handleEndMeeting = async () => {
    if (!myMeeting) return
    await supabase.from('meetings').update({ is_active: false }).eq('id', myMeeting.id)
    setMyMeeting(null)
    setActiveMeeting(null)
  }

  const handleJoinMeeting = () => {
    if (activeMeeting) window.open(activeMeeting.room_url, '_blank')
  }

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

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return
    setDeletingId(projectId)
    await supabase.from('projects').delete().eq('id', projectId)
    await fetchAll()
    setDeletingId(null)
  }

  const onlineMembers = members.filter(m => m.is_online)
  const myIndex = members.findIndex(m => m.id === currentMember.id)
  const meetingStarterName = activeMeeting?.members?.name || ''

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      fontFamily: FONT,
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Meeting notification for others */}
      {notification && (
        <MeetingNotification
          meetingStartedBy={notification.meetingStartedBy}
          roomUrl={notification.roomUrl}
          onJoin={() => { window.open(notification.roomUrl, '_blank'); setNotification(null) }}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Active meeting banner */}
      {activeMeeting && (
        <div style={{
          position: 'relative', zIndex: 2,
          background: '#ffffff',
          color: '#000000',
          padding: '12px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: FONT
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>📹</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {myMeeting ? 'Your meeting is live' : `${meetingStarterName} started a meeting`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!myMeeting && (
              <button onClick={handleJoinMeeting} style={{
                background: '#000000', color: '#ffffff',
                border: 'none', padding: '8px 18px', borderRadius: 4,
                fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: 'pointer'
              }}>
                Join Meeting
              </button>
            )}
            {myMeeting && (
              <button onClick={handleEndMeeting} style={{
                background: 'transparent', color: '#ff4444',
                border: '1px solid #ff4444', padding: '8px 18px', borderRadius: 4,
                fontSize: 15, fontFamily: FONT, cursor: 'pointer'
              }}>
                End Meeting
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 1,
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        padding: '18px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <div style={{ fontSize: 16, letterSpacing: 6, color: '#ffffff', textTransform: 'uppercase', fontStyle: 'italic' }}>
            cowork.dev
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['projects', 'team'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? '#ffffff' : 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: activeTab === tab ? '#000000' : '#888888',
                padding: '7px 18px', borderRadius: 4, cursor: 'pointer',
                fontSize: 16, fontFamily: FONT, textTransform: 'capitalize', transition: 'all 0.2s'
              }}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {onlineMembers.slice(0, 5).map((m, i) => {
                const idx = members.findIndex(mem => mem.id === m.id)
                return (
                  <div key={m.id} title={m.name} style={{
                    width: 30, height: 30, borderRadius: '50%', background: '#222',
                    border: '2px solid #000', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 15, marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i
                  }}>
                    {AVATARS[idx] || '🧑‍💻'}
                  </div>
                )
              })}
            </div>
            <span style={{ fontSize: 16, color: '#aaaaaa' }}>{onlineMembers.length} online</span>
          </div>

          {/* Start meeting button */}
          {!myMeeting && !activeMeeting && (
            <button onClick={handleStartMeeting} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff', padding: '7px 16px', borderRadius: 4,
              cursor: 'pointer', fontSize: 16, fontFamily: FONT, transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              📹 start meeting
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: 18 }}>{AVATARS[myIndex] || '🧑‍💻'}</span>
            <span style={{ fontSize: 16 }}>{currentMember.name}</span>
          </div>

          <button onClick={onLogout} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: '#888888', padding: '7px 16px', borderRadius: 4,
            cursor: 'pointer', fontSize: 16, fontFamily: FONT, transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#888888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}>
            leave
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, padding: '48px 36px', maxWidth: 940, margin: '0 auto', width: '100%' }}>

        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, fontStyle: 'italic' }}>Projects</h2>
                <p style={{ margin: '6px 0 0', fontSize: 17, color: '#666' }}>{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowCreate(true)} style={{
                background: '#ffffff', border: 'none', color: '#000000',
                padding: '12px 26px', borderRadius: 4, cursor: 'pointer',
                fontSize: 17, fontWeight: 700, fontFamily: FONT, transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#dddddd'}
              onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>
                + new project
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#444' }}>
                <div style={{ fontSize: 44, marginBottom: 16 }}>📂</div>
                <p style={{ margin: 0, fontSize: 19 }}>No projects yet. Create one to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {projects.map((project: any) => {
                  const isJoined = joinedProjects.has(project.id)
                  const memberCount = project.project_members?.length || 0
                  const isCreator = project.created_by === currentMember.id
                  const isDeleting = deletingId === project.id

                  return (
                    <div key={project.id} style={{
                      background: isJoined ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isJoined ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8, padding: '26px', transition: 'all 0.2s',
                      opacity: isDeleting ? 0.5 : 1
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                            <h3 style={{ margin: 0, fontSize: 21, fontWeight: 700, fontStyle: 'italic' }}>{project.name}</h3>
                            {isCreator && <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '2px 8px', borderRadius: 3, letterSpacing: 1 }}>OWNER</span>}
                            {isJoined && !isCreator && <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.06)', color: '#aaaaaa', padding: '2px 8px', borderRadius: 3, letterSpacing: 1 }}>JOINED</span>}
                          </div>
                          {project.description && <p style={{ margin: '0 0 14px', fontSize: 17, color: '#888', lineHeight: 1.6 }}>{project.description}</p>}
                          <div style={{ display: 'flex', gap: 18, fontSize: 16, color: '#555' }}>
                            <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                            <span>🕒 {new Date(project.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 150 }}>
                          {project.drive_link && (
                            <a href={project.drive_link} target="_blank" rel="noreferrer" style={{
                              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                              color: '#aaaaaa', padding: '10px 14px', borderRadius: 4, fontSize: 16,
                              textDecoration: 'none', textAlign: 'center', fontFamily: FONT, display: 'block'
                            }}>📁 files</a>
                          )}
                          {!isJoined ? (
                            <button onClick={() => handleJoinProject(project.id)} style={{
                              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                              color: '#ffffff', padding: '10px 14px', borderRadius: 4,
                              fontSize: 16, cursor: 'pointer', fontFamily: FONT, transition: 'all 0.2s'
                            }}>+ join</button>
                          ) : !isCreator ? (
                            <button onClick={() => handleLeaveProject(project.id)} style={{
                              background: 'transparent', border: '1px solid rgba(255,100,100,0.3)',
                              color: '#ff6464', padding: '10px 14px', borderRadius: 4,
                              fontSize: 16, cursor: 'pointer', fontFamily: FONT
                            }}>leave</button>
                          ) : null}
                          {isCreator && (
                            <button onClick={() => handleDeleteProject(project.id)} disabled={isDeleting} style={{
                              background: 'transparent', border: '1px solid rgba(255,60,60,0.3)',
                              color: '#ff4444', padding: '10px 14px', borderRadius: 4,
                              fontSize: 16, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: FONT, transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,60,60,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                              {isDeleting ? 'deleting...' : '🗑 delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div>
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 700, fontStyle: 'italic' }}>Team</h2>
              <p style={{ margin: 0, fontSize: 17, color: '#666' }}>{onlineMembers.length} of {members.length} online</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {members.map((member, i) => (
                <div key={member.id} style={{
                  background: member.id === currentMember.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${member.id === currentMember.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 30 }}>{AVATARS[i]}</div>
                      <div style={{ position: 'absolute', bottom: 0, right: -2, width: 10, height: 10, borderRadius: '50%', background: member.is_online ? '#ffffff' : '#333333', border: '2px solid #000000' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 19 }}>
                        {member.name}
                        {member.id === currentMember.id && <span style={{ color: '#555', fontWeight: 400, fontSize: 16, marginLeft: 10 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 16, color: '#555', marginTop: 3 }}>{member.email}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: member.is_online ? '#ffffff' : '#444' }}>
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
