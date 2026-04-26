# 코드 컨벤션

## 레이어 구조

```
app/api/[route]/route.ts   ← 진입점 (인증 + 요청 파싱 + service 호출 + 응답 반환)
lib/services/              ← 비즈니스 로직 (repository 조합하여 유스케이스 완성)
lib/repositories/          ← Prisma 쿼리 단위 함수 (비즈니스 로직 없음)
hooks/                     ← 클라이언트 상태/API 로직 커스텀 훅
components/                ← UI만 담당 (API 직접 호출 금지)
```

### route.ts 역할
- 인증 확인 (getServerSession / getSessionUserId)
- 요청 파싱 및 입력값 검증 (형식·필수 체크)
- service 함수 호출
- 응답 반환 및 에러 매핑
- Prisma 직접 호출 금지

### service 역할
- repository 조합으로 유스케이스 완성
- 도메인 비즈니스 로직 (소유권 확인, 상태 검증 등)
- 외부 API 호출 (이메일 발송, AI 호출 등)
- Prisma 직접 호출 금지 → repository 경유

### repository 역할
- Prisma 단일 쿼리만 담당
- 비즈니스 로직 없음
- 함수명은 동작을 명확히 표현 (findXxx, createXxx, updateXxx, deleteXxx)

---

## 에러 핸들링

### 에러 클래스 (`lib/services/errors.ts`)
| 클래스 | HTTP 코드 | 용도 |
|--------|-----------|------|
| `NotFoundError` | 404 | 리소스 없음 |
| `ForbiddenError` | 403 | 권한 없음 |
| `ValidationError` | 400 | 비즈니스 규칙 위반 |
| `RateLimitError` | 503 | 외부 API 레이트 리밋 |

### route catch 패턴
```typescript
} catch (e) {
  if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 })
  if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 })
  console.error('경로 에러:', e)
  return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
}
```

### 규칙
- `try/catch` 필수
- `String(e)` 응답 노출 금지 → `'서버 오류가 발생했습니다.'` 고정 문자열
- 에러 응답 형태 통일: `{ error: string }`
- HTTP 상태코드 일관 사용 (401, 403, 404, 400, 500, 503)

---

## 코드 규칙

- **타입 힌트 필수**: 함수 파라미터·반환값에 TypeScript 타입 명시
- **else 금지**: early return 패턴 사용
- **주석**: `//` 스타일로 함수 위에 작성 (`// #` 아님)
- **변수명**: 축약 금지 (`res` → 맥락에 따라 `response` / `result` / 줄여도 명확하면 허용)
- **import**: Prisma는 repository에서만 import

---

## 컴포넌트 규칙

- **hooks/**: 상태·API 로직을 커스텀 훅(`use*`)으로 분리
- **components/**: UI 렌더링만 담당, 훅을 consume
- **alert() 금지**: 에러는 상태(state)로 관리하여 인라인 표시하거나 `onError` prop으로 상위 위임
- **window.confirm**: UI 확인 흐름이므로 컴포넌트에서 허용

### 커스텀 훅 생성 기준
- API fetch 로직이 있는 경우
- 3개 이상의 관련 상태가 묶이는 경우
- 같은 로직이 여러 컴포넌트에서 재사용되는 경우

---

## 파일 위치 규칙

| 파일 | 위치 |
|------|------|
| Prisma 쿼리 함수 | `lib/repositories/[도메인].ts` |
| 비즈니스 로직 | `lib/services/[도메인].ts` |
| 에러 클래스 | `lib/services/errors.ts` |
| API 진입점 | `app/api/[경로]/route.ts` |
| 커스텀 훅 | `hooks/use[기능].ts` |
| UI 컴포넌트 | `components/[컴포넌트명].tsx` |
| 공유 유틸리티 | `lib/[유틸명].ts` |
