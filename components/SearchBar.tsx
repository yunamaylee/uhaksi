'use client'

import Button from '@/components/ui/Button'
import { useSchoolSearch } from '@/hooks/useSchoolSearch'

export default function SearchBar() {
  const { query, setQuery, results, showDropdown, setShowDropdown, isNavigating, notFound, select, search } =
    useSchoolSearch()

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
        <input
          className="ui-input"
          type="text"
          value={isNavigating ? '이동 중...' : query}
          disabled={isNavigating}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            if (next.length < 1) setShowDropdown(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && void search()}
          placeholder="학교 이름을 입력하세요"
          style={{
            flex: 1,
            borderRadius: '14px',
            fontSize: '15px',
            boxShadow: 'var(--ui-shadow)',
            opacity: isNavigating ? 0.6 : 1,
          }}
        />
        <Button
          onClick={() => void search()}
          variant="primary"
          style={{ padding: '11px 18px', borderRadius: '14px', fontSize: '15px' }}
        >
          {isNavigating ? '이동 중...' : '검색'}
        </Button>

        {showDropdown && results.length > 0 && !isNavigating && (
          <ul
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: '72px',
              background: 'white',
              border: '1px solid var(--sage-border)',
              borderRadius: '14px',
              listStyle: 'none',
              padding: '4px 0',
              margin: 0,
              zIndex: 30,
              maxHeight: '288px',
              overflowY: 'auto',
              boxShadow: '0 10px 24px rgba(15, 20, 25, 0.12)',
            }}
          >
            {results.map((school) => (
              <li
                key={school.id}
                onClick={() => select(school)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--sage-text)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{school.name}</span>
                  {school.address && (
                    <span style={{ fontSize: '12px', color: 'var(--sage-muted)' }}>{school.address}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {notFound && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#dc2626' }}>
          학교를 찾을 수 없습니다. 다시 검색해보세요.
        </p>
      )}
    </div>
  )
}
