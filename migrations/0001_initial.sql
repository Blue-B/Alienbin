-- Alienbin v2 initial schema
-- 시간은 Unix timestamp seconds로 통일한다.
CREATE TABLE pastes (
    id TEXT PRIMARY KEY,

    payload TEXT NOT NULL,

    encrypted INTEGER NOT NULL DEFAULT 0
        CHECK (encrypted IN (0, 1)),

    encryption_version INTEGER,

    access_proof TEXT,

    burn_after_read INTEGER NOT NULL DEFAULT 0
        CHECK (burn_after_read IN (0, 1)),

    language TEXT,

    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE INDEX idx_pastes_expires_at ON pastes (expires_at);
