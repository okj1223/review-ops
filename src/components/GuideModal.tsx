'use client'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function GuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-end pointer-events-none">

      {/* 패널 */}
      <div className="relative pointer-events-auto w-80 max-h-screen overflow-y-auto bg-white border-l border-slate-200 shadow-2xl text-xs text-slate-600 flex flex-col" style={{ height: '100dvh' }}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
          <span className="font-bold text-slate-800 text-sm">사용 가이드</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-base">✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4">

          <section>
            <p className="font-semibold text-slate-700 mb-2">기본 작업 흐름</p>
            <ol className="flex flex-col gap-1.5 pl-1">
              {[
                '새 작업일 생성 — 날짜, R1/R2 이름 입력 후 Enter 또는 생성 클릭',
                '에피소드 범위 추가 — 오퍼레이터 선택 후 시작~끝 번호 입력, Enter 또는 일괄 추가 클릭',
                'R1은 위에서부터, R2는 아래에서부터 Result 입력 (집중모드 활용 권장)',
                '결과가 일치하면 → OK 자동 처리',
                '결과가 다르면 → Conflict 발생, Final + Reason Code + Route 입력',
                'Final까지 입력 완료되면 → Resolved',
                '모든 에피소드가 OK 또는 Resolved가 되면 작업 완료',
              ].map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-400 shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">⊙ 집중모드</p>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <p>툴바의 <span className="font-medium text-slate-700">⊙ 집중모드</span> 버튼을 클릭해 활성화합니다.</p>
              <p>리뷰어와 진행 방향(↓ 위→아래 / ↑ 아래→위)을 선택하면 전체 화면으로 전환됩니다.</p>
              <p>지나간 행 · 현재 행 · 다음 행 3줄만 표시되며, 현재 행의 Result에 자동 포커스됩니다.</p>
              <p><span className="font-medium text-slate-700">C / D / F / N</span> 키를 누르면 결과가 저장되고 다음 행으로 자동 이동합니다.</p>
              <p><span className="font-medium text-slate-700">Esc</span>를 누르면 일반 모드로 돌아옵니다.</p>
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">Action 상태 기준</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Ready to review',   desc: '아직 아무도 입력하지 않음',                              cls: 'text-slate-400' },
                { label: 'OK',                desc: 'R1과 R2 결과가 완전히 일치',                            cls: 'text-emerald-600 font-medium' },
                { label: 'Conflict | Need …', desc: '결과가 달라 Final / Reason Code / Route 입력 필요',      cls: 'text-red-500 font-medium' },
                { label: 'Resolved',          desc: 'Conflict 해소 완료 (Final + Reason + Route 모두 입력)', cls: 'text-blue-600 font-medium' },
                { label: 'Waiting Lead',      desc: 'Route를 Waiting Lead로 설정한 보류 상태',               cls: 'text-violet-600 font-medium' },
                { label: 'Need R1/R2 Result', desc: '일부 필드를 입력했지만 Result가 빠져 있음',              cls: 'text-amber-600 font-medium' },
              ].map(({ label, desc, cls }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className={`font-medium ${cls}`}>{label}</span>
                  <span className="text-slate-400 pl-1">{desc}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">통계 · 처리 필요 패널</p>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <p>테이블 위 통계 바에서 전체 · OK · Conflict · Resolved · Waiting Lead 건수를 한눈에 확인할 수 있습니다.</p>
              <p><span className="font-medium text-slate-700">처리 필요</span> 패널의 항목을 클릭하면 해당 에피소드 행으로 자동 스크롤되며 잠깐 하이라이트됩니다.</p>
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">교차검수 배너</p>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <p>행에 마우스를 올리면 나타나는 <span className="text-violet-600 font-medium">⚑</span> 버튼을 클릭해 교차검수 시작 지점을 수동으로 지정합니다. 같은 버튼을 다시 클릭하면 제거됩니다.</p>
              <p><span className="font-medium text-slate-600">▲▼</span>으로 위아래 이동, <span className="font-medium text-slate-600">×</span>로 완전 제거. 위치는 저장되어 새로고침 후에도 유지됩니다.</p>
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">행 순서 변경</p>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <p>행에 마우스를 올리면 나타나는 <span className="font-medium text-slate-700">⠿</span> 핸들을 드래그해 행 순서를 변경할 수 있습니다. 변경된 순서는 DB에 저장됩니다.</p>
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">키보드 단축키</p>
            <p className="text-slate-500 mb-1.5">Result 셀 포커스 중 · 집중모드</p>
            <div className="flex gap-3 flex-wrap mb-3">
              {[['C', 'Clean'], ['D', 'Dirty'], ['F', 'Fail'], ['N', 'None']].map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-700 shadow-sm">{key}</kbd>
                  <span className="text-slate-500">{val}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-500 mb-1.5">전역</p>
            <div className="flex flex-col gap-1.5">
              {[
                [['Ctrl', 'Z'], '내 변경 한 단계 되돌리기'],
                [['Enter'], '숫자 입력 필드에서 일괄 추가 / 범위 삭제 실행'],
                [['Enter'], '새 작업일 생성 모달에서 생성 실행'],
                [['Esc'], '집중모드 종료 / 모달 · 드롭다운 닫기'],
              ].map(([keys, desc], i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {(keys as string[]).map((k, j) => (
                      <kbd key={j} className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-[11px] font-mono font-bold text-slate-700 shadow-sm">{k}</kbd>
                    ))}
                  </div>
                  <span className="text-slate-500">{desc as string}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full h-px bg-slate-100" />

          <section>
            <p className="font-semibold text-slate-700 mb-2">전체 보관함 필터</p>
            <div className="flex flex-col gap-1.5 text-slate-500">
              <p>Conflict / Action / Result 각 항목 내에서는 <span className="font-medium text-slate-600">OR</span> 다중 선택이 가능합니다.</p>
              <p>항목들 사이는 <span className="font-medium text-slate-600">AND</span>로 결합됩니다.</p>
              <p>Result 필터: R1·R2 모두 입력된 경우 <span className="font-medium text-slate-600">Final Result</span> 기준, 한 명만 입력된 경우 해당 값 기준.</p>
              <p>필터 적용 상태에서 Excel 버튼을 누르면 필터된 건수 전체를 내보냅니다.</p>
            </div>
          </section>

        </div>
      </div>
    </div>,
    document.body
  )
}
