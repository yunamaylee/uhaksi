<div align="center">

<img width="220" height="200" alt="우학시 배너" src="https://github.com/user-attachments/assets/166d0e56-8073-477e-9c53-8b2179401e1a" />

<br/>
<br/>

**[🌐 서비스 바로가기](https://uhaksi.kr)**

<br/>

[서비스 소개](#서비스-소개) &nbsp;·&nbsp; [주요 기능](#주요-기능) &nbsp;·&nbsp; [아키텍처](#아키텍처) &nbsp;·&nbsp; [기술 스택](#기술-스택) &nbsp;·&nbsp; [코드 구조](#코드-구조) &nbsp;·&nbsp; [핵심 경험](#핵심-경험)

<br/>

## 서비스 소개

**같은 학교 학생들끼리 시험 범위·후기·공부 정보를 나누는 공간입니다.**

NEIS 공공 데이터와 AI를 엮어 정보 수집의 수고를 줄이고,
학생 인증 커뮤니티로 재방문 이유를 만들었습니다.

✔️ 실제 서비스 운영 중 &nbsp;·&nbsp; ✔️ Google 검색 노출 &nbsp;·&nbsp; ✔️ 실사용자 보유

</div>

<br/>

## 주요 기능

**[1] 통신문 사진 → 시험 시간표 자동 정렬**

통신문 사진을 올리면 AI가 과목·날짜·시간을 인식해 학년별 시간표로 변환합니다.

![Image](https://github.com/user-attachments/assets/6b4a1cc9-c77b-4e76-909b-42e12aad3d49)

<br/>

**[2] 학생 리뷰 기반 AI 시험 유형 분석**

후기가 쌓일수록 더 정확해지는 학교별 시험 유형 안내를 제공합니다.

![Image](https://github.com/user-attachments/assets/193d102b-9c38-4d1c-8142-5759290f1063)

<br/>

**[3] 같은 학교 학생들만의 커뮤니티**

익명 게시판, 댓글, 공부 인증 — 시험 기간에 함께할 수 있는 공간입니다.

![Image](https://github.com/user-attachments/assets/49c4c50b-f018-410c-8cf0-c1ad52f411da)

<br/>

**[4] 학생증 + 본명 인증 로그인**

Claude Vision으로 학생증을 검증하고, 본명 정규화 매칭으로 실제 재학생만 커뮤니티에 접근할 수 있습니다.

<img width="964" height="703" alt="Image" src="https://github.com/user-attachments/assets/0d8492c4-c649-48e8-a3f2-c1878570c749" />

<br/>

## 아키텍처

<img width="734" height="433" alt="우학시 아키텍처" src="https://github.com/user-attachments/assets/0e96021a-6019-4861-9e7b-03f43cc8db8b" />

<br/>

## 기술 스택

| Category | Stack |
|----------|-------|
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) |
| **Backend** | ![Next.js](https://img.shields.io/badge/Route_Handler-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| **Auth** | ![NextAuth](https://img.shields.io/badge/NextAuth.js-5682F3?style=flat-square) |
| **AI / 이미지** | ![Anthropic](https://img.shields.io/badge/Claude_Vision-D4A27F?style=flat-square&logo=anthropic&logoColor=white) ![Sharp](https://img.shields.io/badge/Sharp-99CC00?style=flat-square) |
| **외부 연동** | ![NEIS](https://img.shields.io/badge/NEIS_오픈API-0066CC?style=flat-square) ![Resend](https://img.shields.io/badge/Resend-000000?style=flat-square) |
| **Deployment** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white) |

<br/>

## 코드 구조

✔️ **Route → Service → Repository 레이어 분리**

route.ts는 요청/응답만, 비즈니스 로직은 `lib/services/`, DB 접근은 `lib/repositories/`로 단일 책임 원칙에 따라 분리했습니다.
app/api/exam/route.ts       → 요청/응답만
lib/services/exam.ts        → 비즈니스 로직
lib/repositories/exam.ts    → Prisma 쿼리

✔️ **커스텀 훅으로 상태와 UI 분리**

클라이언트 컴포넌트의 fetch 로직을 `hooks/`로 분리해 컴포넌트는 UI만 담당합니다.
hooks/useExamReview.ts      → 시험 후기 상태 관리
hooks/useSchoolSearch.ts    → 학교 검색 상태 관리
hooks/useCommunityWrite.ts  → 게시글 작성 상태 관리

✔️ **커스텀 에러 클래스로 에러 통합 관리**

`NotFoundError`, `ForbiddenError`, `MailDeliveryError` 등 커스텀 에러 클래스로 에러 타입을 명확히 구분하고, route에서 일관된 HTTP 상태코드로 응답합니다.

<br/>

## 핵심 경험

🤖 **AI를 실제 서비스에 적용한 경험**

- **학생증 Vision 인증** — Claude Vision으로 학생증 이미지를 분석해 본명을 추출하고, 정규화 매칭으로 실제 재학생만 가입할 수 있도록 구현했습니다.
- **시험 시간표 자동 파싱** — 통신문 사진을 Sharp로 전처리(회전 보정·그레이스케일·샤프닝)한 뒤 Claude Vision에 전달해 인식률을 높였습니다.
- **AI 시험 유형 분석** — 누적된 학생 리뷰를 AI로 분석해 학교별 출제 경향을 자동으로 요약합니다.

<br/>

🧪 **유저테스트로 서비스 방향을 바꾼 경험**

> "시험 정보는 한 번 보고 끝인데, 자주 들어올 이유가 없어요."

이 피드백 하나로 학생 커뮤니티를 추가했습니다. 단발성 서비스에서 재방문 이유가 있는 서비스로 바뀐 전환점이었습니다.

<br/>

⚡ **학교 검색 — 세 번의 기술 선택**

DB 쿼리 → 정적 JSON → 캐싱 + 병렬 로딩 순으로 바꿨습니다.
언제 단순한 방법을 쓰고, 언제 바꿔야 하는가를 직접 겪으며 결정했습니다.

<br/>

🔑 **신뢰를 코드로 구현한 접근 제어**

본명 일치 검사, 작성자 서버 검증, 시험지 업로드 Vision 차단까지 — 신뢰할 수 있는 공간을 코드로 만들었습니다.

<br/>

🔍 **SEO — 검색에서 찾을 수 있어야 쓰인다**

사이트맵·robots.txt·JSON-LD를 추가하고, Vercel 환경에서 한글 파일명 이미지 깨짐 문제를 트러블슈팅했습니다. 현재 Google 검색에 노출되고 있습니다.

<br/>

## 로컬 실행

```bash
npm install
npm run dev
```
