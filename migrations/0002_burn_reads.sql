-- 열람 횟수 옵션: burn paste가 1회 강제가 아니라 N회까지 열릴 수 있게 한다.
-- max_reads는 burn_after_read=1인 row에만 의미가 있고, 비burn paste에서는 NULL이다.
ALTER TABLE pastes ADD COLUMN max_reads INTEGER;
ALTER TABLE pastes ADD COLUMN read_count INTEGER NOT NULL DEFAULT 0;
