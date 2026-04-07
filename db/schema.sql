-- ============================================================
-- Review Ops DB Schema
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

CREATE TABLE work_days (
  date        DATE PRIMARY KEY,
  r1_name     TEXT NOT NULL,
  r2_name     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_date       DATE NOT NULL REFERENCES work_days(date) ON DELETE CASCADE,
  episode         TEXT NOT NULL,
  target          TEXT DEFAULT '',
  r1_result       TEXT DEFAULT '',
  r1_pick         TEXT DEFAULT '',
  r1_place        TEXT DEFAULT '',
  r2_result       TEXT DEFAULT '',
  r2_pick         TEXT DEFAULT '',
  r2_place        TEXT DEFAULT '',
  final_result    TEXT DEFAULT '',
  final_pick      TEXT DEFAULT '',
  final_place     TEXT DEFAULT '',
  reason_code     TEXT DEFAULT '',
  reason_detail   TEXT DEFAULT '',
  response_detail TEXT DEFAULT '',
  route           TEXT DEFAULT '',
  last_editor     TEXT DEFAULT '',
  last_updated    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(work_date, episode)
);

-- Realtime 활성화 (Supabase 대시보드 Database > Replication에서도 확인)
ALTER TABLE entries  REPLICA IDENTITY FULL;
ALTER TABLE work_days REPLICA IDENTITY FULL;

-- RLS: 인증 없이 전체 공개 (2인 내부 사용 기준)
ALTER TABLE work_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_work_days" ON work_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_entries"   ON entries   FOR ALL USING (true) WITH CHECK (true);
