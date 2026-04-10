# Review Ops

Review Ops는 모방학습 및 강화학습 데이터 검수를 위한 교차 검수 운영 도구입니다.
두 명의 리뷰어(R1 / R2)가 같은 에피소드를 독립적으로 검수하고, 불일치가 생기면 최종 판단과 사유를 구조적으로 기록할 수 있게 설계했습니다.

## 무엇을 해결하나

- 작업일 단위로 검수 세트를 관리합니다.
- 에피소드 범위를 한 번에 등록하고, 필요하면 삽입·삭제·재정렬할 수 있습니다.
- 에피소드별 Task를 개별 지정하거나 구간 단위로 일괄 적용할 수 있습니다.
- R1 / R2 입력값 차이를 자동으로 감지해 Conflict를 표시합니다.
- Final Result, Final Frame, Reason Code, Route로 충돌 해소 과정을 남길 수 있습니다.
- Focus Mode, 단축키, PiP로 대량 입력 속도를 높일 수 있습니다.
- 홈 인사이트와 전체 보관함에서 과거 결과를 조회하고 Excel로 내보낼 수 있습니다.

## 핵심 기능

### 1. 작업일 관리

- 날짜, R1 이름, R2 이름으로 새 작업일을 생성합니다.
- 작업일은 독립된 검수 세트이며, 생성 시점의 설정 스냅샷을 함께 저장합니다.
- 홈 화면에서 작업 상태, 진행률, 에피소드 범위, 완료 시각을 확인할 수 있습니다.
- 날짜 범위, 상태, 리뷰어 이름으로 작업일 목록을 필터링할 수 있습니다.

### 2. 에피소드 및 Task 관리

- 시작 번호와 끝 번호를 지정해 에피소드 범위를 일괄 추가할 수 있습니다.
- 개별 에피소드를 직접 추가하거나 행 사이에 삽입할 수 있습니다.
- Task를 행별로 편집하거나 지정한 구간에 한 번에 적용할 수 있습니다.
- 행 단위 삭제, 범위 삭제, 드래그 앤 드롭 재정렬을 지원합니다.
- 교차검수 시작 지점을 배너로 표시해 작업 분기 시점을 남길 수 있습니다.

### 3. 교차검수 및 충돌 해소

- R1 / R2 각각 Result와 프레임 값들을 입력합니다.
- 두 리뷰어 값이 다르면 자동으로 Conflict를 감지합니다.
- 충돌이 생기면 Final Result, Final Frame, Reason Code, Route를 입력해 해소합니다.
- Reason Detail, Response Detail, 메모를 추가로 남길 수 있습니다.
- Action 상태를 통해 처리 필요 항목과 완료 항목을 빠르게 구분할 수 있습니다.

### 4. Focus Mode 및 단축키

- R1 또는 R2를 선택해 집중 입력 모드를 실행할 수 있습니다.
- 진행 방향을 위에서 아래 또는 아래에서 위로 정할 수 있습니다.
- Chrome / Edge에서는 Document Picture-in-Picture 기반 플로팅 창을 사용합니다.
- 지원되지 않는 브라우저에서는 전체 화면 오버레이로 동작합니다.
- 현재 행 중심으로 이전 / 현재 / 다음 3행만 보여 빠른 반복 입력에 집중할 수 있습니다.
- 결과 버튼 클릭 또는 단축키 입력 시 자동 저장 후 다음 행으로 이동합니다.
- `Tab`으로 리뷰어를 전환하고 `Esc`로 종료할 수 있습니다.

### 5. 인사이트, 보관함, 내보내기

- 홈 인사이트에서 에피소드 범위, 오퍼레이터, Task, Result 기준 통계를 볼 수 있습니다.
- 전체 보관함에서 날짜, 에피소드, 오퍼레이터, Task, Action, Result 기준으로 과거 데이터를 검색할 수 있습니다.
- 작업일 상세 화면과 전체 보관함에서 Excel 다운로드를 지원합니다.
- 필터 결과는 그룹 간 AND, 같은 그룹 내 OR 방식으로 조합됩니다.

### 6. 설정 관리

- Result, Reason Code, Route, Task 옵션을 전역 설정으로 관리합니다.
- 프레임 컬럼은 최대 3개까지 사용할 수 있습니다.
- 설정은 새 작업일 생성 시 복사되며, 기존 작업일에는 즉시 반영되지 않습니다.
- Task 옵션을 삭제해도 기존 엔트리에 저장된 값은 유지됩니다.

## 기본 사용 흐름

1. 홈에서 새 작업일을 생성합니다.
2. 작업일 상세 화면에서 에피소드 범위를 추가합니다.
3. 필요하면 Task를 구간 단위로 지정합니다.
4. R1과 R2가 각각 결과를 입력합니다.
5. 값이 다르면 Conflict가 생기고, Final / Reason / Route를 입력해 해소합니다.
6. 완료된 데이터는 전체 보관함에서 다시 조회하거나 Excel로 내보냅니다.

## Action 상태

- `Ready to review`: 아직 아무 입력도 없는 상태입니다.
- `Conflict | Need ...`: 충돌은 감지됐지만 Final / Reason / Route 중 필요한 값이 비어 있습니다.
- `Waiting Lead`: Route가 `Waiting Lead`로 지정된 보류 상태입니다.
- `Resolved`: 충돌이 있었고, 필요한 해소 값이 모두 채워진 상태입니다.
- `Clear stale resolution fields`: 현재 충돌은 없지만 예전 Final / Reason / Route 값이 남아 있습니다.
- `OK`: 현재 로직상 충돌이 없고 정리해야 할 stale resolution 값도 없는 상태입니다.

## Conflict 계산 규칙

현재 로직은 아래 기준으로 Conflict를 계산합니다.

- `r1_result`와 `r2_result`가 모두 있고 서로 다르면 `Result` 충돌입니다.
- `r1_pick`와 `r2_pick`이 모두 있고 서로 다르면 `Pick` 충돌입니다.
- `r1_place`와 `r2_place`가 모두 있고 서로 다르면 `Place` 충돌입니다.
- `r1_frame3`와 `r2_frame3`가 모두 있고 서로 다르면 `Frame3` 충돌입니다.
- 한쪽만 값이 있는 경우는 Conflict가 아니라 미입력 또는 진행 중인 상태로 취급합니다.

## 화면 구성

### 홈 화면

- 작업일 생성
- 작업일 목록 조회 및 정렬
- 날짜, 상태, 리뷰어 이름 필터
- 인사이트 패널
- 설정, 가이드, 전체 보관함 이동

### 작업일 상세 화면

- 에피소드 범위 추가, 삽입, 삭제
- Task 개별 편집 및 범위 일괄 적용
- 행 재정렬
- 교차검수 시작 배너 지정
- 처리 필요 항목 패널과 통계 요약
- Focus Mode 실행
- Excel 내보내기
- `Ctrl+Z` 되돌리기

### 전체 보관함

- 날짜 범위 조회
- 에피소드, 오퍼레이터, Task, 리뷰어 이름 검색
- Conflict / Action / Result 필터
- 필터 결과 Excel 내보내기

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- `xlsx`
- Vercel

## 프로젝트 구조

- `src/app/page.tsx`: 홈 화면
- `src/app/[id]/page.tsx`: 작업일 상세 화면
- `src/app/archive/page.tsx`: 전체 보관함
- `src/components/WorkDayTable.tsx`: 작업일 상세 메인 테이블 및 도구 모음
- `src/components/EntryRow.tsx`: 개별 엔트리 행
- `src/components/FocusMode.tsx`: Focus Mode 입력 UI
- `src/components/CreateWorkDayModal.tsx`: 작업일 생성 모달
- `src/components/SettingsModal.tsx`: 전역 설정 모달
- `src/components/GuideModal.tsx`: 사용 가이드
- `src/hooks/useEntries.ts`: 엔트리 로딩, 저장, 추가, 삭제, 재정렬
- `src/hooks/useAppSettings.ts`: 전역 설정 로드 및 저장
- `src/lib/logic.ts`: Conflict 및 Action 계산 로직
- `src/lib/types.ts`: 주요 타입 정의
- `src/lib/supabase.ts`: Supabase 클라이언트 초기화
- `db/schema.sql`: Supabase 초기 스키마 초안

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트의 `.env.local`에 아래 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. 데이터베이스 준비

- Supabase에 `work_days`, `entries`, `app_settings` 테이블이 필요합니다.
- `db/schema.sql`은 초기 스키마 출발점으로 사용할 수 있습니다.
- 현재 저장소 상태에서는 앱 코드가 `config`, `cross_banner_episode`, `completed_at`, `sort_order`, `frame3`, `note`, `app_settings.value` 같은 추가 필드도 사용합니다.
- 새 환경을 직접 구성할 때는 스키마와 현재 코드가 사용하는 필드가 일치하는지 먼저 확인하는 것이 안전합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## 사용 가능한 스크립트

```bash
npm run dev
npm run build
npm run start
npm run lint
```

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드 생성
- `npm run start`: 빌드 결과로 프로덕션 서버 실행
- `npm run lint`: ESLint 검사 실행

## 데이터 모델 개요

- `work_days`: 날짜, 리뷰어 이름, 작업일별 설정 스냅샷, 교차검수 배너 위치, 완료 시각 등 작업일 메타데이터를 저장합니다.
- `entries`: 에피소드, 오퍼레이터, Task, R1 / R2 입력값, Final 해소값, 메모, 마지막 수정자, 정렬 순서 등 개별 검수 행 데이터를 저장합니다.
- `app_settings`: 전역 dropdown / frame 설정을 JSON 형태로 저장합니다.

## 현재 동작상 알아둘 점

- 사용자 식별은 계정 기반 인증이 아니라 브라우저 `localStorage`의 이름 값을 사용합니다.
- 설정 변경은 기존 작업일 전체에 일괄 반영되지 않고, 새로 생성하는 작업일에만 복사됩니다.
- 실시간 반영은 Supabase Realtime과 주기적 polling을 함께 사용합니다.
- Undo는 현재 세션에서 내가 만든 수정만 되돌릴 수 있으며, 영구 이력 관리 기능은 아닙니다.
- Action의 `OK`는 현재 구현상 "양쪽 검수가 모두 끝남"보다는 "충돌이 없음"에 더 가까운 의미로 계산됩니다.

## 한 줄 요약

Review Ops는 두 리뷰어의 교차검수, 충돌 해소, 빠른 입력, 재조회와 추출을 하나의 작업 흐름으로 묶은 운영형 검수 도구입니다.
