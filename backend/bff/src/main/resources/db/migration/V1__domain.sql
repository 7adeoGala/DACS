CREATE TABLE app_users (
    id UUID PRIMARY KEY, issuer VARCHAR(255) NOT NULL, subject VARCHAR(100) NOT NULL,
    display_name VARCHAR(160) NOT NULL, email VARCHAR(254), UNIQUE (issuer, subject)
);
CREATE TABLE leagues (
    id UUID PRIMARY KEY, name VARCHAR(100) NOT NULL, owner_id UUID NOT NULL REFERENCES app_users(id),
    invite_code UUID NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE league_members (
    id UUID PRIMARY KEY, league_id UUID NOT NULL REFERENCES leagues(id),
    user_id UUID NOT NULL REFERENCES app_users(id), role VARCHAR(16) NOT NULL CHECK (role IN ('OWNER','MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL, UNIQUE (league_id, user_id)
);
CREATE TABLE racing_sessions (
    id UUID PRIMARY KEY, season INTEGER NOT NULL CHECK (season >= 1950),
    round INTEGER NOT NULL CHECK (round > 0), type VARCHAR(16) NOT NULL CHECK (type IN ('RACE','SPRINT','QUALIFYING')),
    name VARCHAR(160) NOT NULL, circuit VARCHAR(160) NOT NULL, race_date DATE NOT NULL,
    starts_at TIMESTAMPTZ, UNIQUE (season, round, type)
);
CREATE TABLE predictions (
    id UUID PRIMARY KEY, member_id UUID NOT NULL REFERENCES league_members(id),
    session_id UUID NOT NULL REFERENCES racing_sessions(id), submitted_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0, UNIQUE (member_id, session_id)
);
CREATE TABLE prediction_picks (
    prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 2), driver_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (prediction_id, position), UNIQUE (prediction_id, driver_id)
);
CREATE TABLE session_results (
    id UUID PRIMARY KEY, session_id UUID NOT NULL UNIQUE REFERENCES racing_sessions(id),
    published_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE result_finishers (
    result_id UUID NOT NULL REFERENCES session_results(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0), driver_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (result_id, position), UNIQUE (result_id, driver_id)
);
CREATE INDEX league_members_user_idx ON league_members(user_id);
CREATE INDEX predictions_session_idx ON predictions(session_id);
