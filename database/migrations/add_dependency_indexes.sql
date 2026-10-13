-- Add indexes for dependency tracking to optimize winner advancement queries
-- This ensures fast lookups even for large tournaments (100+ participants)

-- Index for finding matches that depend on a specific match as match1
CREATE INDEX IF NOT EXISTS idx_depends_on_match1 ON matches(depends_on_match1_id);

-- Index for finding matches that depend on a specific match as match2
CREATE INDEX IF NOT EXISTS idx_depends_on_match2 ON matches(depends_on_match2_id);

-- Composite index for tournament + dependency queries (optimal for large tournaments)
CREATE INDEX IF NOT EXISTS idx_tournament_dependencies ON matches(tournament_id, depends_on_match1_id, depends_on_match2_id);

-- Index for round-based queries (useful for bracket display)
CREATE INDEX IF NOT EXISTS idx_tournament_round ON matches(tournament_id, round_number, match_number);
