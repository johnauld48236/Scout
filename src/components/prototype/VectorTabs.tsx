'use client'

interface VectorTabsProps {
  activeVector: 'out' | 'in'
  onVectorChange: (vector: 'out' | 'in') => void
}

export function VectorTabs({ activeVector, onVectorChange }: VectorTabsProps) {
  return (
    <div
      className="flex border-b mb-6"
      style={{ borderColor: 'var(--scout-border)' }}
    >
      <button
        onClick={() => onVectorChange('out')}
        className={`flex-1 py-4 text-center font-medium transition-all relative ${
          activeVector === 'out' ? 'text-scout-saddle' : 'text-scout-earth-light hover:text-scout-earth'
        }`}
        style={{
          color: activeVector === 'out' ? 'var(--scout-saddle)' : 'var(--scout-earth-light)',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">→</span>
          <div className="text-left">
            <div className="text-sm font-semibold">Vector → Out</div>
            <div className="text-xs font-normal" style={{ color: 'var(--scout-earth-light)' }}>
              Sales Intelligence
            </div>
          </div>
        </div>
        {activeVector === 'out' && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: 'var(--scout-saddle)' }}
          />
        )}
      </button>

      <button
        onClick={() => onVectorChange('in')}
        className={`flex-1 py-4 text-center font-medium transition-all relative ${
          activeVector === 'in' ? 'text-scout-saddle' : 'text-scout-earth-light hover:text-scout-earth'
        }`}
        style={{
          color: activeVector === 'in' ? 'var(--scout-saddle)' : 'var(--scout-earth-light)',
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">←</span>
          <div className="text-left">
            <div className="text-sm font-semibold">Vector ← In</div>
            <div className="text-xs font-normal" style={{ color: 'var(--scout-earth-light)' }}>
              Account Management
            </div>
          </div>
        </div>
        {activeVector === 'in' && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: 'var(--scout-saddle)' }}
          />
        )}
      </button>
    </div>
  )
}
