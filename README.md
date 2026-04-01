# Review Ops

모방학습 및 강화학습 데이터 검수를 위한 교차 검수 시스템입니다.
두 명의 리뷰어가 같은 에피소드를 각각 검수하고, 결과가 다를 경우 최종 판단과 사유를 남길 수 있도록 설계되어 있습니다.

이 프로젝트의 핵심은 단순한 체크리스트 UI가 아니라, 실제 운영 과정에서 자주 생기는 아래 문제를 줄이는 데 있습니다.

- 누가 어느 작업일을 맡았는지 한눈에 파악하기 어려운 문제
- 같은 에피소드를 두 사람이 교차 검수할 때 충돌 건을 놓치는 문제
- 충돌은 발견했지만 최종 판단과 사유 기록이 빠지는 문제
- 다량의 에피소드를 입력할 때 속도가 느려지는 문제
- 과거 검수 결과를 다시 찾아보거나 추출하기 어려운 문제

## 프로젝트 목표

- 작업일 단위로 R1 / R2 검수 쌍을 생성
- 에피소드 범위를 한 번에 등록하고 빠르게 검수
- 리뷰어 간 값 차이를 자동으로 탐지
- 충돌 건에 대해 Final / Reason / Route를 구조적으로 기록
- 집중모드와 단축키로 대량 입력 속도를 높임
- 전체 보관함에서 기간별 검색과 Excel 추출 지원

## 주요 개념

### 작업일

작업일은 하루 단위의 검수 묶음입니다.
하나의 작업일에는 아래 정보가 포함됩니다.

- 날짜
- R1 리뷰어 이름
- R2 리뷰어 이름
- 해당 작업일에 적용되는 드롭다운 / 프레임 설정
- 교차검수 시작 배너 위치
- 완료 시각

즉, "2026-04-01 / R1 경준 / R2 홍길동" 같은 한 세트를 하나의 작업일로 관리합니다.

### 엔트리

엔트리는 개별 에피소드 검수 레코드입니다.
각 엔트리에는 아래 종류의 값이 들어갑니다.

- 기본 식별 정보: 작업일, 날짜, 에피소드 번호
- R1 입력값: Result, Pick, Place, Frame3
- R2 입력값: Result, Pick, Place, Frame3
- 최종 해소값: Final Result, Final Pick, Final Place, Final Frame3
- 사유 및 후속 처리: Reason Code, Reason Detail, Response Detail, Route
- 운영 보조값: Note, Last Editor, Last Updated, Sort Order

### 교차검수

두 리뷰어가 동일한 엔트리를 독립적으로 검수하고, 서로 결과가 다를 경우 충돌로 판단합니다.
충돌이 발생하면 최종 판단값과 사유를 채워 해소 상태로 바꿉니다.

## 화면 구성

### 1. 홈 화면

홈 화면은 작업일 목록을 관리하는 대시보드입니다.

주요 기능:

- 작업일 목록 조회
- 날짜 범위 필터
- 상태 필터
- 검수자 이름 필터
- 정렬 전환
- 새 작업일 생성
- 설정 모달 진입
- 전체 보관함 이동

화면에서 바로 확인할 수 있는 정보:

- 작업일 날짜
- R1 / R2 이름
- 작업 상태 배지
- 에피소드 범위 요약
- 완료 수 / 전체 수 진행률 바
- 완료 시각

### 2. 작업일 상세 화면

실제 검수 작업이 이루어지는 핵심 화면입니다.

주요 기능:

- 에피소드 범위 일괄 추가
- 개별 에피소드 직접 추가
- 행 사이 삽입
- 개별 행 삭제
- 범위 삭제
- 드래그로 순서 변경
- 교차검수 배너 위치 지정
- 처리 필요 항목 패널
- 통계 요약 바
- Excel 내보내기
- 집중모드 실행
- 세션 기준 되돌리기

### 3. 전체 보관함

과거 데이터를 다시 찾거나 내보내기 위한 조회 화면입니다.

주요 기능:

- 날짜 범위 기준 전체 엔트리 조회
- 에피소드 검색
- 검수자 검색
- Conflict 필터
- Action 필터
- Result 필터
- 필터 결과 Excel 내보내기

## 기본 사용 흐름

### 1. 작업일 생성

사용자는 홈 화면에서 새 작업일을 생성합니다.
이때 아래 값을 입력합니다.

- 날짜
- R1 이름
- R2 이름

생성 시점에 현재 전역 설정이 해당 작업일의 `config`로 복사됩니다.
즉, 이후 전역 설정이 바뀌더라도 이미 생성된 작업일의 컬럼 구성이 자동으로 바뀌지는 않습니다.

### 2. 에피소드 범위 등록

작업일 상세 화면에서 시작 번호와 끝 번호를 입력해 여러 에피소드를 한 번에 추가할 수 있습니다.
누가 먼저 작업을 시작하는지에 따라 operator 성격의 값이 `target` 필드에 저장됩니다.

예시:

- 1 ~ 100 입력 시 100개의 엔트리가 일괄 생성
- 중간에 누락 에피소드가 있으면 행 삽입으로 보완 가능

### 3. 리뷰어별 1차 입력

R1, R2는 각 Result와 프레임 값을 입력합니다.

일반적으로 다음 흐름을 염두에 둔 UI입니다.

- R1은 위에서 아래로
- R2는 아래에서 위로
- 빠른 입력이 필요할 경우 집중모드 사용

### 4. 충돌 감지

아래 값이 모두 입력되어 있고 서로 다르면 충돌로 간주합니다.

- Result
- Pick
- Place
- Frame3

충돌이 발생하면 `Conflict` 컬럼에 어떤 항목이 충돌했는지 표시되고, `Action` 컬럼이 후속 입력 필요 상태로 바뀝니다.

### 5. 충돌 해소

충돌 건은 아래 값을 채워서 정리합니다.

- Final Result
- Final frame 값들
- Reason Code
- Route

필요하면 아래 서술형 필드도 함께 기록합니다.

- Reason Detail
- Response Detail

### 6. 완료 확인 및 추출

모든 엔트리가 `OK` 또는 `Resolved` 상태가 되면 작업이 마무리된 것으로 봅니다.
이후 Excel로 내보내거나, 전체 보관함에서 다시 조회할 수 있습니다.

## Action 상태 기준

이 시스템에서 가장 중요한 계산 중 하나가 `Action`입니다.
각 엔트리가 지금 어떤 상태인지 자동으로 판단해서 후속 작업이 필요한지 보여줍니다.

### `Ready to review`

- 아직 아무도 입력하지 않은 상태

### `Need R1 Result`

- R1이 프레임 등 일부 값은 입력했지만 Result는 비어 있는 상태

### `Need R2 Result`

- R2가 프레임 등 일부 값은 입력했지만 Result는 비어 있는 상태

### `OK`

- 충돌 없이 정리된 상태
- 현재 로직상 R1 / R2 값이 서로 충돌하지 않으면 `OK`로 간주

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
- 프레임 열 이름 최대 3개

예시:

- Result: `Clean`, `Dirty`, `Fail`, `None`
- Reason Code: `Result mismatch`, `Frame mismatch`, `Wrong target`, `Missed frame`, `Other`
- Route: `Reviewer Agreement`, `Waiting Lead`, `Lead Finalized`

프레임 컬럼은 기본적으로 `Pick`, `Place`를 사용하며 최대 3개까지 설정할 수 있습니다.

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
