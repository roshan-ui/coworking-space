'use client'

const FONT = "'Times New Roman', Times, serif"

export default function MeetingNotification({
  meetingStartedBy,
  roomUrl,
  onJoin,
  onDismiss
}: {
  meetingStartedBy: string
  roomUrl: string
  onJoin: () => void
  onDismiss: () => void
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 1000,
      background: '#ffffff',
      color: '#000000',
      borderRadius: 10,
      padding: '20px 24px',
      fontFamily: FONT,
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      maxWidth: 320,
      animation: 'slideIn 0.3s ease'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
            Meeting Started
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic' }}>
            {meetingStartedBy} started a meeting
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'transparent',
          border: 'none',
          fontSize: 20,
          cursor: 'pointer',
          color: '#999',
          lineHeight: 1,
          marginLeft: 12
        }}>×</button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onJoin} style={{
          flex: 2,
          background: '#000000',
          color: '#ffffff',
          border: 'none',
          padding: '10px 14px',
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: FONT,
          cursor: 'pointer'
        }}>
          📹 Join Now
        </button>
        <button onClick={onDismiss} style={{
          flex: 1,
          background: 'transparent',
          color: '#666',
          border: '1px solid #ddd',
          padding: '10px 14px',
          borderRadius: 6,
          fontSize: 15,
          fontFamily: FONT,
          cursor: 'pointer'
        }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}
