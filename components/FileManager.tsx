'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Member } from '@/lib/supabase'

const FONT = "'Times New Roman', Times, serif"

type ProjectFile = {
  name: string
  id: string
  updated_at: string
  metadata: { size: number; mimetype: string }
}

export default function FileManager({
  projectId,
  projectName,
  currentMember,
  onClose
}: {
  projectId: string
  projectName: string
  currentMember: Member
  onClose: () => void
}) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const folderPath = `project-${projectId}`

  const fetchFiles = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from('project-files')
      .list(folderPath, { sortBy: { column: 'updated_at', order: 'desc' } })
    if (!error && data) {
      setFiles(data as any)
    }
    setLoading(false)
  }

  useEffect(() => { fetchFiles() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setUploadProgress(0)

    const filePath = `${folderPath}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      setError('Upload failed. Try again.')
    } else {
      await fetchFiles()
    }
    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (fileName: string) => {
    const { data } = await supabase.storage
      .from('project-files')
      .createSignedUrl(`${folderPath}/${fileName}`, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return
    await supabase.storage.from('project-files').remove([`${folderPath}/${fileName}`])
    await fetchFiles()
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['unitypackage', 'unity', 'prefab', 'asset'].includes(ext || '')) return '🎮'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return '🗜️'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'psd'].includes(ext || '')) return '🖼️'
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return '🎬'
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return '🎵'
    if (['pdf'].includes(ext || '')) return '📄'
    if (['cs', 'js', 'ts', 'py', 'cpp', 'h'].includes(ext || '')) return '💻'
    return '📁'
  }

  // Strip timestamp prefix from display name
  const displayName = (name: string) => name.replace(/^\d+-/, '')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: FONT
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12,
        width: '100%', maxWidth: 640,
        maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontStyle: 'italic', color: '#fff' }}>
              {projectName}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#555' }}>Project files</p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: '#555', fontSize: 22, cursor: 'pointer', lineHeight: 1
          }}>×</button>
        </div>

        {/* Upload area */}
        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '18px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            background: uploading ? 'rgba(255,255,255,0.02)' : 'transparent'
          }}>
            <span style={{ fontSize: 22 }}>⬆️</span>
            <span style={{ fontSize: 16, color: uploading ? '#555' : '#aaa' }}>
              {uploading ? `Uploading...` : 'Click to upload any file (up to 500MB)'}
            </span>
          </label>
          {error && <p style={{ margin: '8px 0 0', fontSize: 14, color: '#ff4444' }}>{error}</p>}
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
          {loading ? (
            <p style={{ color: '#444', fontSize: 16, textAlign: 'center', padding: '40px 0' }}>Loading files...</p>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: 16 }}>No files yet. Upload something!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(file => (
                <div key={file.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 8, gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{getFileIcon(file.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName(file.name)}
                      </div>
                      <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                        {formatSize(file.metadata?.size)} · {new Date(file.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleDownload(file.name)} style={{
                      background: '#ffffff', color: '#000000',
                      border: 'none', padding: '7px 14px', borderRadius: 4,
                      fontSize: 14, fontWeight: 700, fontFamily: FONT, cursor: 'pointer'
                    }}>⬇ Download</button>
                    <button onClick={() => handleDelete(file.name)} style={{
                      background: 'transparent', color: '#ff4444',
                      border: '1px solid rgba(255,60,60,0.3)', padding: '7px 12px', borderRadius: 4,
                      fontSize: 14, fontFamily: FONT, cursor: 'pointer'
                    }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
