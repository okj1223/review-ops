# Review Ops

Review Ops는 모방학습 및 강화학습 데이터 검수를 위한 교차 검수 도구입니다.
두 명의 리뷰어(R1 / R2)가 동일한 에피소드를 독립적으로 검수하고, 불일치가 있을 때는 최종 판단과 사유를 구조적으로 기록할 수 있도록 설계되었습니다.

## 핵심 목표

- 작업일 단위로 검수 세트를 관리
- 에피소드 범위 일괄 등록 및 빠른 데이터 입력 지원
- 에피소드별 Task 분류 및 구간 일괄 지정 지원
- R1/R2 간 값 차이를 자동으로 감지
- 충돌 시 Final / Reason / Route를 체계적으로 기록
- 홈 인사이트에서 필터 기반 결과/Task 통계 확인
- 집중모드 · 단축키 · PiP로 대량 입력 효율화
- 전체 보관함에서 과거 데이터 조회 및 Excel 추출

## 구현된 주요 기능

### GitHub 저장소

- 이 프로젝트는 공개 저장소로 공유하면 협업과 코드 리뷰에 유리합니다.
- 코드 전체를 확인하려면 다음 주소를 이용하세요:
  - https://github.com/okj1223/review-ops

### 1. 작업일 관리

- 날짜, R1 이름, R2 이름을 입력해 새 작업일 생성
- 각 작업일은 개별 검수 세트로 저장되고, 생성 시점의 설정을 그대로 복사
- 홈 화면에서 작업 상태 · 완료 진행률 · 에피소드 범위 · 마지막 완료 시각 확인
- 홈 화면 인사이트에서 에피소드 범위/오퍼레이터/task/결과 필터 기반 통계 확인
- 날짜 범위 · 상태 · 검수자 이름 필터로 작업일 목록 빠르게 조회
- 최신순/오래된순 정렬 기능

### 2. 에피소드 관리

- 작업일 상세 화면에서 시작 번호/끝 번호 지정으로 범위 일괄 추가
- 개별 에피소드 직접 추가 및 행 사이 삽입
- 행별 Task 지정 및 에피소드 구간 Task 일괄 적용
- 범위 삭제 기능으로 대량 삭제 지원
- 행 단위 삭제 및 드래그 앤 드롭으로 순서 변경
- 교차검수 시작 지점 배너 지정 및 저장
- 행 클릭 시 자동 스크롤 / 하이라이트 지원

### 3. 교차검수 · 충돌 감지

- R1/R2 각각 Result, Pick, Place, Frame3 입력
- 두 리뷰어 값이 다르면 자동으로 Conflict 표시
- Conflict 발생 시 `Action`이 처리 필요 상태로 전환
- 해결 단계에서 Final Result, Final 프레임 값, Reason Code, Route를 입력
- Reason Detail, Response Detail을 추가로 기록 가능
- `OK`, `Resolved`, `Waiting Lead` 등 상태로 작업 흐름 파악

### 4. 집중모드

- R1 또는 R2를 선택해 집중 모드 실행
- 진행 방향(위 → 아래 / 아래 → 위) 지정 가능
- Chrome/Edge에서는 PiP(플로팅 창)로, 기타 브라우저에서는 전체 화면 오버레이로 표시
- 현재 행 · 이전 행 · 다음 행 3줄만 보여 빠른 입력 집중 지원
- 결과 버튼 클릭 또는 단축키 입력 시 자동 저장 후 다음 행 이동
- 메모 입력 시 함께 저장
- Tab으로 검수자 전환, Esc로 모드 종료

### 5. 단축키 · 되돌리기

- 작업 중 입력 속도 향상을 위한 키보드 단축키 지원
- 집중모드에서 결과 선택 단축키 자동 배정
- 일반 화면에서도 Ctrl+Z로 내 세션 내 마지막 변경 되돌리기
- 작업일 내 상태 변경 히스토리를 세션 단위로 추적

### 6. 설정 관리

- 전역 설정에서 Result / Reason Code / Route / Task 옵션 구성
- 최대 3개까지 프레임 컬럼(Pick, Place, Frame3 등) 설정 가능
- 옵션 추가, 삭제, 순서 변경 가능
- Task 옵션을 삭제해도 기존 엔트리에 저장된 Task 값은 유지
- 설정은 새 작업일부터 적용되고 기존 작업일에는 영향을 주지 않음

### 7. 전체 보관함

- 날짜 범위 기준으로 과거 엔트리 조회
- 에피소드 검색 · 오퍼레이터 검색 · Task 검색
- Conflict 여부 필터
- Action 상태 필터
- Result 필터
- 필터 결과를 Excel로 다운로드
- 필터 간 AND, 같은 그룹 내 OR 방식으로 조합

### 8. Excel 내보내기

- 작업일 상세 화면에서 현재 작업일의 전체 행을 엑셀로 추출
- 전체 보관함에서 필터링된 결과를 엑셀로 추출
- 출력 항목에 날짜 · 에피소드 · R1/R2 결과 · Conflict · Action · Final · Reason · Route · 상태 정보 포함

## 화면 구성

### 홈 화면

- 작업일 생성 버튼
- 작업일 목록
- 날짜 필터, 상태 필터, 검수자 이름 검색
- 인사이트 패널(에피소드/오퍼레이터/task/결과 필터 + 성공률/분포)
- 설정 버튼, 가이드 버튼, 전체 보관함 이동
- 작업 상태 배지가 완료/진행중 표시

### 작업일 상세 화면

- 에피소드 범위 일괄 추가
- 개별 에피소드 추가 및 삽입
- Task 컬럼 편집 및 범위 Task 일괄 적용
- 드래그로 행 순서 조정
- 교차검수 시작 지점 지정
- 처리 필요 항목 패널 및 통계 요약
- Focus 모드 실행
- Excel 내보내기
- Ctrl+Z 되돌리기

### 전체 보관함

- 날짜 범위 조회
- 에피소드 검색
- 오퍼레이터 검색
- Task 검색
- 검수자 이름 검색
- Conflict / Action / Result 필터
- 필터링된 결과 Excel 내보내기

## 사용 흐름 예시

1. 홈에서 새 작업일 생성
2. 작업일 상세 화면에서 에피소드 범위를 한 번에 추가
3. R1/R2가 각각 결과 입력
4. 결과가 다르면 Conflict가 생기고 Final / Reason / Route 입력
5. 모든 엔트리가 OK/Resolved가 되면 작업 완료
6. 전체 보관함에서 필요 시 과거 데이터 검색 및 Excel 추출

## 주요 용어

- 작업일: 하루 단위 검수 묶음
- 엔트리: 개별 에피소드 검수 레코드
- Conflict: R1/R2 결과 불일치
- Final: 충돌 해소 후 최종 판단값
- Reason Code / Route: 충돌 해소 사유 및 후속 처리
- Focus Mode: 빠른 검수 입력 전용 모드
- Archive: 과거 데이터 조회 화면

## 기술 스택

- Next.js (App Router)
- React
- Supabase
- TypeScript
- Tailwind CSS
- XLSX 기반 Excel 내보내기
- Vercel (배포/호스팅)

## 호스팅 및 백엔드

- Vercel
  - Next.js 앱을 배포하고, GitHub 연동 시 커밋 푸시마다 자동 배포가 가능합니다.
  - 정적 자원과 서버리스 기능을 함께 제공하여 빠른 응답과 쉬운 공유를 지원합니다.

- Supabase
  - PostgreSQL 기반 데이터베이스로 `work_days`, `entries` 등 검수 데이터를 저장합니다.
  - `@supabase/supabase-js` 클라이언트를 통해 브라우저에서 직접 DB에 연결합니다.
  - 실시간 채널을 사용해 작업일 목록과 엔트리 상태를 자동 갱신합니다.
  - 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)로 인증 정보를 관리합니다.
  - DB 스키마는 `db/schema.sql`에 저장되어 있으며, Supabase SQL Editor에서 실행/편집하여 테이블 구조를 관리합니다.

## 실행 방법

1. 레포지토리 클론
2. `npm install`
3. 로컬 환경 변수에 Supabase 설정 추가
4. `npm run dev`

---

> 이 README는 현재 구현된 기능을 중심으로 작성되었습니다. 실제 앱에서 제공하는 작업일 관리, 집중모드, 충돌 해소, 전체 보관함 검색, Excel 추출 기능을 그대로 반영합니다.

### `Conflict | Need ...`

- 리뷰어 간 값 차이가 있음
- Final Result / Final Frame / Reason Code / Route 중 필요한 값이 아직 덜 채워진 상태

### `Waiting Lead`

- Route가 `Waiting Lead`로 설정된 상태
- 즉시 종결하지 않고 리드 판단을 기다리는 케이스

### `Resolved`

- 충돌이 있었고, Final / Reason / Route가 필요한 수준으로 채워진 상태

### `Clear stale resolution fields`

- 현재는 충돌이 없는데 Final / Reason / Route 관련 값이 남아 있는 상태
- 예전 충돌 해결 흔적이 남았거나 수동 수정으로 데이터가 뒤섞인 경우를 의미

## Conflict 판단 규칙

현재 로직은 아래 방식으로 충돌을 계산합니다.

- `r1_result`와 `r2_result`가 모두 있고 서로 다르면 `Result` 충돌
- `r1_pick`와 `r2_pick`이 모두 있고 서로 다르면 `Pick` 충돌
- `r1_place`와 `r2_place`가 모두 있고 서로 다르면 `Place` 충돌
- `r1_frame3`와 `r2_frame3`가 모두 있고 서로 다르면 `Frame3` 충돌

즉, "둘 다 값이 있는 경우"에만 충돌로 봅니다.
한쪽이 비어 있는 경우는 충돌이 아니라 미입력 또는 진행 중인 상태에 더 가깝게 처리합니다.

## 집중모드

집중모드는 빠른 대량 입력을 위한 전용 인터페이스입니다.

핵심 특징:

- 리뷰어 선택 가능
- 진행 방향 선택 가능
- 현재 행 중심으로 이전 / 현재 / 다음 3행만 표시
- Result를 버튼 또는 키보드 단축키로 입력 가능
- 메모를 함께 저장 가능
- Chrome / Edge에서는 PiP(Document Picture-in-Picture) 사용 가능
- PiP가 안 되면 전체화면 오버레이 방식으로 동작

### 집중모드가 유용한 상황

- 에피소드 수가 많고 Result 입력이 반복적일 때
- 검수 화면과 참조 화면을 나란히 띄워야 할 때
- R1 / R2가 빠르게 순회 입력할 때

### 집중모드에서 가능한 조작

- 결과 버튼 클릭
- 결과 단축키 입력
- 위 / 아래 이동
- 메모 입력
- Tab으로 리뷰어 전환
- Esc로 종료

## 부가 기능

### 1. 메모

각 엔트리에는 간단한 메모를 붙일 수 있습니다.

용도 예시:

- 애매했던 판단 근거 기록
- 추후 다시 확인할 포인트 표시
- 리드에게 넘길 때 보조 설명 기록

### 2. 교차검수 시작 배너

특정 에피소드 위치를 "교차검수 시작 지점"으로 표시할 수 있습니다.

용도 예시:

- 어느 시점부터 두 명이 동시에 보기 시작했는지 구분
- 운영상 분기 지점 표시
- 작업 인수인계 포인트 표식

### 3. Undo

현재 세션에서 내가 변경한 내용에 한해 되돌리기가 가능합니다.

제약:

- 브라우저 새로고침 후에는 유지되지 않음
- 다른 사람이 수정한 내용은 되돌리지 않음
- 영구 버전 히스토리 역할은 아님

### 4. Excel 내보내기

작업일 상세와 전체 보관함에서 각각 Excel 다운로드가 가능합니다.

사용 예시:

- 일일 검수 결과 공유
- 리드 검토용 정리본 생성
- 외부 보고용 추출

## 설정 시스템

설정은 전역 설정으로 저장되며, 새 작업일 생성 시 해당 설정이 복사됩니다.

현재 설정 가능한 항목:

- Result 옵션
- Reason Code 옵션
- Route 옵션
- Task 옵션
- 프레임 열 이름 최대 3개

예시:

- Result: `Clean`, `Dirty`, `Fail`, `None`
- Reason Code: `Result mismatch`, `Frame mismatch`, `Wrong target`, `Missed frame`, `Other`
- Route: `Reviewer Agreement`, `Waiting Lead`, `Lead Finalized`
- Task: `Episode Review`, `Pick`, `Place`

프레임 컬럼은 기본적으로 `Pick`, `Place`를 사용하며 최대 3개까지 설정할 수 있습니다.
Task 옵션에서 항목을 삭제해도 기존 엔트리에 이미 저장된 Task 값은 유지됩니다.

## 데이터 모델

### `work_days`

작업일 메타데이터를 저장하는 테이블입니다.

주요 필드:

- `id`
- `date`
- `r1_name`
- `r2_name`
- `created_at`
- `config`
- `cross_banner_episode`
- `completed_at`

### `entries`

개별 에피소드 검수 데이터를 저장하는 테이블입니다.

주요 필드:

- `id`
- `work_day_id`
- `work_date`
- `episode`
- `target`
- `sort_order`
- `r1_result`, `r1_pick`, `r1_place`, `r1_frame3`
- `r2_result`, `r2_pick`, `r2_place`, `r2_frame3`
- `final_result`, `final_pick`, `final_place`, `final_frame3`
- `reason_code`
- `reason_detail`
- `response_detail`
- `route`
- `note`
- `last_editor`
- `last_updated`

### `app_settings`

전역 설정 저장용 테이블입니다.

주요 역할:

- 새 작업일 생성 시 기본 dropdown / frame 설정 제공

## 코드 구조

### `src/app`

- `page.tsx`: 홈 화면
- `[id]/page.tsx`: 작업일 상세 화면
- `archive/page.tsx`: 전체 보관함

### `src/components`

- `WorkDayTable.tsx`: 작업일 상세의 메인 테이블과 도구 모음
- `EntryRow.tsx`: 개별 엔트리 행
- `FocusMode.tsx`: 집중모드 입력 UI
- `PiPWindow.tsx`: PiP 창 렌더링 보조
- `CreateWorkDayModal.tsx`: 작업일 생성 모달
- `SettingsModal.tsx`: 전역 설정 모달
- `GuideModal.tsx`: 사용 가이드
- `NameSelector.tsx`: 로컬 사용자 이름 선택

### `src/hooks`

- `useEntries.ts`: 엔트리 로딩, upsert, 추가, 삭제, 재정렬
- `useAppSettings.ts`: 전역 설정 로드 / 저장
- `useUserName.ts`: 브라우저 로컬 사용자 이름 관리

### `src/lib`

- `types.ts`: 주요 타입 정의
- `logic.ts`: conflict / action 계산 로직
- `constants.ts`: 기본 설정값
- `supabase.ts`: Supabase 클라이언트 초기화

## 실시간 동기화 방식

현재는 아래 두 방식을 함께 사용합니다.

- Supabase Realtime 구독
- 주기적 polling

이중으로 사용하는 이유는 실시간 반영 누락을 줄이기 위해서입니다.
즉시 반영과 안정성을 둘 다 확보하려는 구조입니다.

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. 개발 서버 실행

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

### `npm run dev`

- 개발 서버 실행

### `npm run build`

- 프로덕션 빌드 생성

### `npm run start`

- 빌드 결과로 프로덕션 서버 실행

### `npm run lint`

- ESLint 검사 실행

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- xlsx

## 현재 운영 메모

현재 구현 기준으로 알아두면 좋은 사항들입니다.

### 1. 사용자 식별

- 사용자 이름은 현재 브라우저 `localStorage`에 저장됩니다.
- 계정 기반 인증이 아니라 로컬 이름 기반입니다.

### 2. 작업일 설정 적용 시점

- 설정 변경은 즉시 기존 작업일 전체에 적용되지 않습니다.
- 저장 이후 새로 만드는 작업일에만 반영됩니다.

### 3. 실시간 반영

- Realtime과 polling을 함께 사용합니다.
- 네트워크 상태에 따라 즉시 반영과 약간의 지연 반영이 섞일 수 있습니다.

### 4. Undo 범위

- 현재 세션에서 내가 만든 수정 이력만 되돌릴 수 있습니다.
- 영구 이력 관리나 감사 로그는 아닙니다.

## 개선 아이디어 메모

운영을 더 안정적으로 만들기 위해 향후 고려할 수 있는 항목입니다.

- 사용자 인증 및 역할 분리
- 리드 전용 최종 해소 권한
- 변경 이력 로그 테이블
- 작업 완료 체크리스트
- 충돌 건 SLA / 담당자 관리
- 보관함 고급 검색
- 통계 대시보드

## 한 줄 요약

Review Ops는 "두 리뷰어의 교차검수, 충돌 해소, 빠른 입력, 재조회와 추출"을 한 화면 흐름 안에서 처리하기 위한 운영형 검수 도구입니다.
