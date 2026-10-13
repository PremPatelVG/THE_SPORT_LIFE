-- =====================================================
-- SPORTFORLIFE - COMPLETE UPDATED DATABASE SCHEMA
-- Based on Sp_updated.odt Requirements
-- 
-- KEY FEATURES IMPLEMENTED:
-- 1. Players can create and manage tournaments
-- 2. Players can create teams and assign captains  
-- 3. Players can be assigned as referees for matches
-- 4. Multi-role conflict prevention system
-- 5. Complete financial tracking with escrow model
-- 6. Advanced auto-scheduling with validation
-- 7. Referee assignment request/accept workflow
-- 8. Tournament quality control and suspension
-- 9. Refund policy management
-- 10. Emergency referee pool from spectators
-- =====================================================

-- Enable trigger/function creation without SUPER privilege
SET GLOBAL log_bin_trust_function_creators = 1;

-- =====================================================
-- 1. USER MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    handedness ENUM('left', 'right', 'ambidextrous'),
    date_of_birth DATE,
    profile_image VARCHAR(255),
    
    -- System Fields
    role ENUM('player', 'admin', 'scorer', 'spectator') DEFAULT 'player' NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone),
    INDEX idx_users_role (role),
    INDEX idx_users_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Verification Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    INDEX idx_otp_phone (phone),
    INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. SPORTS & USER PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS sports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    category ENUM('racquet', 'team') NOT NULL,
    min_players_per_side INT NOT NULL,
    max_players_per_side INT NOT NULL,
    scoring_system JSON,
    default_match_duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    INDEX idx_sports_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sport_id INT NOT NULL,
    skill_level ENUM('beginner', 'intermediate', 'expert', 'professional') DEFAULT 'beginner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_user_sport (user_id, sport_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    
    INDEX idx_user_sports_user (user_id),
    INDEX idx_user_sports_sport (sport_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. VENUE & COURT MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS venues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Address
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Contact
    contact_person VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    
    -- Additional Info
    facilities JSON,
    operating_hours JSON,
    images JSON,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    INDEX idx_venues_city (city),
    INDEX idx_venues_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venue_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    court_type VARCHAR(100) NOT NULL,
    surface_type VARCHAR(100),
    dimensions VARCHAR(100),
    sport_ids JSON,
    features JSON,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    maintenance_schedule JSON,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    
    INDEX idx_courts_venue (venue_id),
    INDEX idx_courts_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Weather Tracking for Outdoor Sports
CREATE TABLE IF NOT EXISTS venue_weather_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venue_id INT NOT NULL,
    alert_date DATE NOT NULL,
    alert_time TIME NOT NULL,
    weather_condition ENUM('rain', 'storm', 'extreme_heat', 'fog', 'wind') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    affected_courts JSON,
    action_taken ENUM('continue', 'delay', 'cancel', 'monitor') DEFAULT 'monitor',
    resolved_at TIMESTAMP,
    notes TEXT,
    
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE,
    INDEX idx_weather_venue_date (venue_id, alert_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. TOURNAMENT MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS tournaments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sport_id INT NOT NULL,
    venue_id INT,
    organizer_id INT NOT NULL,
    logo VARCHAR(255),
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start DATETIME NOT NULL,
    registration_end DATETIME NOT NULL,
    
    -- Configuration
    max_participants INT,
    entry_fee DECIMAL(10,2) DEFAULT 0.00,
    prize_money DECIMAL(10,2) DEFAULT 0.00,
    format_type ENUM('knockout', 'round_robin', 'groups_knockout', 'league', 'ladder') NOT NULL,
    category ENUM('singles', 'doubles', 'teams') NOT NULL,
    
    -- Status
    status ENUM('draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft' NOT NULL,
    
    -- Rules & Settings
    rules JSON,
    
    -- Financial tracking
    total_collected DECIMAL(10,2) DEFAULT 0.00,
    platform_commission_percent DECIMAL(5,2) DEFAULT 10.00,
    organizer_payout_status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (organizer_id) REFERENCES users(id),
    
    INDEX idx_tournaments_sport (sport_id),
    INDEX idx_tournaments_status (status),
    INDEX idx_tournaments_dates (start_date, end_date),
    INDEX idx_tournaments_organizer (organizer_id),
    INDEX idx_tournaments_deleted (deleted_at),
    
    CONSTRAINT check_tournament_dates CHECK (end_date >= start_date),
    CONSTRAINT check_registration_dates CHECK (registration_end <= start_date),
    CONSTRAINT check_entry_fee CHECK (entry_fee >= 0),
    CONSTRAINT check_prize_money CHECK (prize_money >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tournament Creator Wallet
CREATE TABLE IF NOT EXISTS tournament_creator_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_earned DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_withdrawn DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    bank_account_verified BOOLEAN DEFAULT FALSE,
    bank_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_wallet_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Tournament Templates for Repeated Events
CREATE TABLE IF NOT EXISTS tournament_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_by INT NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    sport_id INT NOT NULL,
    format_type ENUM('knockout', 'round_robin', 'groups_knockout', 'league', 'ladder') NOT NULL,
    category ENUM('singles', 'doubles', 'teams') NOT NULL,
    rules JSON,
    default_entry_fee DECIMAL(10,2),
    default_duration_days INT,
    default_max_participants INT,
    is_public BOOLEAN DEFAULT FALSE,
    times_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    
    INDEX idx_templates_creator (created_by),
    INDEX idx_templates_sport (sport_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. TOURNAMENT BRACKETS & GROUPS
-- =====================================================

-- NEW: Tournament Bracket Structure
CREATE TABLE IF NOT EXISTS tournament_brackets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    bracket_type ENUM('main', 'consolation', 'qualifying') DEFAULT 'main',
    round_number INT NOT NULL,
    position_number INT NOT NULL,
    participant_id INT,
    seed_number INT,
    advanced_from_match_id INT,
    status ENUM('waiting', 'active', 'eliminated') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_bracket_position (tournament_id, bracket_type, round_number, position_number),
    INDEX idx_brackets_tournament (tournament_id),
    INDEX idx_brackets_round (tournament_id, round_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Group Stages for League Format
CREATE TABLE IF NOT EXISTS tournament_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    group_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_tournament_group (tournament_id, group_name),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    INDEX idx_groups_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    participant_id INT NOT NULL,
    position INT,
    
    UNIQUE KEY unique_group_participant (group_id, participant_id),
    FOREIGN KEY (group_id) REFERENCES tournament_groups(id) ON DELETE CASCADE,
    
    INDEX idx_group_participants_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. TEAMS (For Team Sports)
-- =====================================================

CREATE TABLE IF NOT EXISTS teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    tournament_id INT NOT NULL,
    creator_id INT NOT NULL,
    captain_id INT NOT NULL,
    logo VARCHAR(255),
    description TEXT,
    max_players INT DEFAULT 11,
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_team_name_tournament (name, tournament_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (captain_id) REFERENCES users(id),
    
    INDEX idx_teams_tournament (tournament_id),
    INDEX idx_teams_creator (creator_id),
    INDEX idx_teams_captain (captain_id),
    INDEX idx_teams_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    position VARCHAR(50),
    jersey_number INT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_team_member (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_team_members_team (team_id),
    INDEX idx_team_members_user (user_id),
    INDEX idx_team_members_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    invited_user_id INT NOT NULL,
    invited_by INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    
    UNIQUE KEY unique_team_invitation (team_id, invited_user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    
    INDEX idx_team_invitations_team (team_id),
    INDEX idx_team_invitations_user (invited_user_id),
    INDEX idx_team_invitations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. PARTNERSHIPS (For Doubles)
-- =====================================================

CREATE TABLE IF NOT EXISTS partnerships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    partnership_name VARCHAR(255),
    status ENUM('pending', 'confirmed', 'dissolved') DEFAULT 'pending' NOT NULL,
    created_by INT NOT NULL,
    invitation_id INT,
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_partnership (tournament_id, player1_id, player2_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_partnerships_tournament (tournament_id),
    INDEX idx_partnerships_player1 (player1_id),
    INDEX idx_partnerships_player2 (player2_id),
    INDEX idx_partnerships_deleted (deleted_at),
    
    CHECK (player1_id < player2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partnership_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    inviter_id INT NOT NULL,
    invitee_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    
    UNIQUE KEY unique_partnership_invitation (tournament_id, inviter_id, invitee_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_partnership_invitations_tournament (tournament_id),
    INDEX idx_partnership_invitations_invitee (invitee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update partnerships to link invitation
ALTER TABLE partnerships
ADD FOREIGN KEY (invitation_id) REFERENCES partnership_invitations(id);

-- =====================================================
-- 8. TOURNAMENT PARTICIPANTS
-- =====================================================

CREATE TABLE IF NOT EXISTS tournament_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    
    -- Participant can be: individual user, partnership, or team
    user_id INT,
    partnership_id INT,
    team_id INT,
    
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending' NOT NULL,
    payment_id VARCHAR(255),
    seed_number INT,
    status ENUM('registered', 'confirmed', 'withdrawn', 'disqualified') DEFAULT 'registered' NOT NULL,
    
    UNIQUE KEY unique_tournament_participant (tournament_id, user_id, partnership_id, team_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    INDEX idx_participants_tournament (tournament_id),
    INDEX idx_participants_user (user_id),
    INDEX idx_participants_partnership (partnership_id),
    INDEX idx_participants_team (team_id),
    INDEX idx_participants_status (status),
    
    CHECK (
        (user_id IS NOT NULL AND partnership_id IS NULL AND team_id IS NULL) OR
        (user_id IS NULL AND partnership_id IS NOT NULL AND team_id IS NULL) OR
        (user_id IS NULL AND partnership_id IS NULL AND team_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update group_participants foreign key
ALTER TABLE group_participants
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;

-- Update tournament_brackets foreign key
ALTER TABLE tournament_brackets
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;

-- NEW: Lucky Loser System
CREATE TABLE IF NOT EXISTS lucky_losers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    participant_id INT NOT NULL,
    eliminated_in_round INT,
    ranking_points INT DEFAULT 0,
    available_for_replacement BOOLEAN DEFAULT TRUE,
    replaced_participant_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (replaced_participant_id) REFERENCES tournament_participants(id),
    
    INDEX idx_lucky_losers_tournament (tournament_id),
    INDEX idx_lucky_losers_available (available_for_replacement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. SCHEDULING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS schedule_constraints (
    tournament_id INT PRIMARY KEY,
    min_rest_hours INT DEFAULT 2 NOT NULL,
    max_matches_per_day INT DEFAULT 3 NOT NULL,
    buffer_minutes INT DEFAULT 15 NOT NULL,
    daily_start_time TIME DEFAULT '09:00:00' NOT NULL,
    daily_end_time TIME DEFAULT '20:00:00' NOT NULL,
    match_duration_minutes INT DEFAULT 60 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    CONSTRAINT check_schedule_times CHECK (daily_end_time > daily_start_time),
    CONSTRAINT check_rest_hours CHECK (min_rest_hours >= 0),
    CONSTRAINT check_max_matches CHECK (max_matches_per_day >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS court_availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    court_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    booking_type ENUM('tournament', 'maintenance', 'private', 'blocked') DEFAULT 'tournament',
    tournament_id INT,
    match_id INT,
    booked_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_court_slot (court_id, date, start_time, end_time),
    FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by) REFERENCES users(id),
    
    INDEX idx_court_availability_date (court_id, date),
    INDEX idx_court_availability_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. MATCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    group_id INT,
    round_number INT NOT NULL,
    match_number INT NOT NULL,
    round_name VARCHAR(50),
    
    -- Participants
    participant1_id INT,
    participant2_id INT,
    
    -- Venue & Scheduling
    venue_id INT,
    court_id INT,
    match_date DATE,
    match_time TIME,
    estimated_duration INT DEFAULT 90,
    
    -- Match Format
    best_of_sets INT DEFAULT 3,
    sets_played INT DEFAULT 0,
    
    -- Officials
    referee_id INT,
    
    -- Match Status
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover') DEFAULT 'scheduled' NOT NULL,
    
    -- Results
    winner_participant_id INT,
    score JSON,
    
    -- Dependencies
    depends_on_match1_id INT,
    depends_on_match2_id INT,
    depends_on_position VARCHAR(20),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES tournament_groups(id),
    FOREIGN KEY (participant1_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (participant2_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (venue_id) REFERENCES venues(id),
    FOREIGN KEY (court_id) REFERENCES courts(id),
    FOREIGN KEY (referee_id) REFERENCES users(id),
    FOREIGN KEY (winner_participant_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (depends_on_match1_id) REFERENCES matches(id),
    FOREIGN KEY (depends_on_match2_id) REFERENCES matches(id),
    
    INDEX idx_matches_tournament (tournament_id),
    INDEX idx_matches_group (group_id),
    INDEX idx_matches_datetime (match_date, match_time),
    INDEX idx_matches_court (court_id),
    INDEX idx_matches_status (status),
    INDEX idx_matches_referee (referee_id),
    INDEX idx_matches_round (tournament_id, round_number),
    INDEX idx_matches_participants (participant1_id, participant2_id),
    INDEX idx_matches_winner (winner_participant_id),
    
    CONSTRAINT check_match_participants CHECK (
        participant1_id IS NOT NULL AND 
        participant2_id IS NOT NULL AND 
        participant1_id != participant2_id
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update court_availability foreign key
ALTER TABLE court_availability
ADD FOREIGN KEY (match_id) REFERENCES matches(id);

-- Update tournament_brackets foreign key
ALTER TABLE tournament_brackets
ADD FOREIGN KEY (advanced_from_match_id) REFERENCES matches(id);

CREATE TABLE IF NOT EXISTS player_schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    match_id INT NOT NULL,
    role ENUM('participant', 'referee') NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('confirmed', 'pending', 'cancelled') DEFAULT 'confirmed' NOT NULL,
    
    UNIQUE KEY unique_player_match (player_id, match_id),
    UNIQUE KEY unique_player_time_slot (player_id, scheduled_date, scheduled_time),
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    
    INDEX idx_player_schedule_player (player_id),
    INDEX idx_player_schedule_datetime (scheduled_date, scheduled_time),
    INDEX idx_player_schedule_datetime_status (scheduled_date, scheduled_time, status),
    INDEX idx_player_schedule_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduling_conflicts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    match_id INT,
    conflict_type ENUM('player_busy', 'court_occupied', 'no_referee', 'rest_time_violation', 'referee_unavailable') NOT NULL,
    conflict_details TEXT,
    involved_player_id INT,
    involved_court_id INT,
    attempted_time DATETIME NOT NULL,
    resolution_status ENUM('pending', 'resolved', 'ignored') DEFAULT 'pending' NOT NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (involved_player_id) REFERENCES users(id),
    FOREIGN KEY (involved_court_id) REFERENCES courts(id),
    
    INDEX idx_conflicts_tournament (tournament_id),
    INDEX idx_conflicts_match (match_id),
    INDEX idx_conflicts_status (resolution_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. SCORING & STATISTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS scoring_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scorer_id INT NOT NULL,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (scorer_id) REFERENCES users(id),
    
    INDEX idx_scoring_match (match_id),
    INDEX idx_scoring_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Detailed Match Statistics
CREATE TABLE IF NOT EXISTS match_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    participant_id INT NOT NULL,
    
    -- Common stats
    points_scored INT DEFAULT 0,
    points_conceded INT DEFAULT 0,
    
    -- Racquet sports specific
    aces INT DEFAULT 0,
    double_faults INT DEFAULT 0,
    first_serve_percentage DECIMAL(5,2),
    break_points_won INT DEFAULT 0,
    unforced_errors INT DEFAULT 0,
    winners INT DEFAULT 0,
    
    -- Team sports specific
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    substitutions INT DEFAULT 0,
    
    -- Volleyball specific
    spikes INT DEFAULT 0,
    blocks INT DEFAULT 0,
    serves INT DEFAULT 0,
    digs INT DEFAULT 0,
    
    -- Additional sport-specific data
    stats_json JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_match_participant_stats (match_id, participant_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    
    INDEX idx_match_stats_match (match_id),
    INDEX idx_match_stats_participant (participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. STANDINGS & RANKINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS tournament_standings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    group_id INT,
    participant_id INT NOT NULL,
    
    matches_played INT DEFAULT 0 NOT NULL,
    matches_won INT DEFAULT 0 NOT NULL,
    matches_lost INT DEFAULT 0 NOT NULL,
    matches_drawn INT DEFAULT 0 NOT NULL,
    points INT DEFAULT 0 NOT NULL,
    sets_won INT DEFAULT 0,
    sets_lost INT DEFAULT 0,
    games_won INT DEFAULT 0,
    games_lost INT DEFAULT 0,
    
    -- Team sports specific
    goal_difference INT DEFAULT 0,
    form VARCHAR(10),
    
    position INT,
    is_eliminated BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_tournament_standing (tournament_id, participant_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES tournament_groups(id),
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    
    INDEX idx_standings_tournament (tournament_id),
    INDEX idx_standings_group (group_id),
    INDEX idx_standings_position (tournament_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. LADDER SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS ladder_rankings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    participant_id INT NOT NULL,
    current_rank INT NOT NULL,
    previous_rank INT,
    points INT DEFAULT 0,
    challenges_issued INT DEFAULT 0,
    challenges_won INT DEFAULT 0,
    challenges_lost INT DEFAULT 0,
    last_match_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_ladder_participant (tournament_id, participant_id),
    UNIQUE KEY unique_tournament_rank (tournament_id, current_rank),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    
    INDEX idx_ladder_tournament (tournament_id),
    INDEX idx_ladder_rank (tournament_id, current_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ladder_challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    challenger_id INT NOT NULL,
    challenged_id INT NOT NULL,
    challenge_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    proposed_match_date DATETIME,
    match_id INT,
    status ENUM('pending', 'accepted', 'declined', 'completed', 'expired') DEFAULT 'pending',
    challenger_rank_at_time INT,
    challenged_rank_at_time INT,
    notes TEXT,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (challenger_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (challenged_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    
    INDEX idx_challenges_tournament (tournament_id),
    INDEX idx_challenges_status (status),
    INDEX idx_challenges_challenger (challenger_id),
    INDEX idx_challenges_challenged (challenged_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 14. PLAYER STATISTICS & ACHIEVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS player_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sport_id INT NOT NULL,
    
    -- Overall Career Stats
    total_matches INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    win_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Sport-specific stats
    detailed_stats JSON,
    
    -- Rankings
    current_ranking INT,
    highest_ranking INT,
    ranking_points INT DEFAULT 0,
    
    last_match_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_player_sport_stats (user_id, sport_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    
    INDEX idx_player_stats_user (user_id),
    INDEX idx_player_stats_sport (sport_id),
    INDEX idx_player_stats_ranking (current_ranking)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    badge_icon VARCHAR(255),
    category ENUM('participation', 'performance', 'milestone', 'special') NOT NULL,
    criteria JSON,
    points INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tournament_id INT,
    
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    
    INDEX idx_user_achievements_user (user_id),
    INDEX idx_user_achievements_achievement (achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 15. PAYMENTS & FINANCIAL TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tournament_id INT NOT NULL,
    participant_id INT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method VARCHAR(50),
    payment_gateway_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending' NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    refund_date TIMESTAMP,
    refund_reason TEXT,
    refunded_amount DECIMAL(10,2) DEFAULT 0.00,
    refunded_by INT,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (refunded_by) REFERENCES users(id),
    
    INDEX idx_payments_user (user_id),
    INDEX idx_payments_tournament (tournament_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wallet_id INT NOT NULL,
    tournament_id INT,
    payment_id INT,
    participant_id INT,
    transaction_type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    description TEXT,
    balance_after DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (wallet_id) REFERENCES tournament_creator_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id),
    
    INDEX idx_wallet_transactions_wallet (wallet_id),
    INDEX idx_wallet_transactions_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Prize Distribution
CREATE TABLE IF NOT EXISTS prize_distribution (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    position INT NOT NULL,
    position_name VARCHAR(50),
    prize_amount DECIMAL(10,2) NOT NULL,
    participant_id INT,
    payment_status ENUM('pending', 'processing', 'paid') DEFAULT 'pending',
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id),
    
    INDEX idx_prize_tournament (tournament_id),
    INDEX idx_prize_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 16. REFEREE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS referee_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referee_id INT NOT NULL,
    total_matches_assigned INT DEFAULT 0,
    matches_completed INT DEFAULT 0,
    matches_missed INT DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    last_match_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_referee (referee_id),
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_referee_performance_score (reliability_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS referee_availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referee_id INT NOT NULL,
    tournament_id INT,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_referee_slot (referee_id, available_date, start_time),
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    INDEX idx_referee_availability_referee (referee_id),
    INDEX idx_referee_availability_date (available_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Referee Certifications
CREATE TABLE IF NOT EXISTS referee_certifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referee_id INT NOT NULL,
    sport_id INT NOT NULL,
    certification_level ENUM('beginner', 'intermediate', 'advanced', 'professional') NOT NULL,
    certified_date DATE,
    expiry_date DATE,
    certification_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE KEY unique_referee_sport_cert (referee_id, sport_id),
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    
    INDEX idx_certifications_sport (sport_id),
    INDEX idx_certifications_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 17. MATCH VERIFICATION & DISPUTES
-- =====================================================

CREATE TABLE IF NOT EXISTS match_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    participant_id INT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_time TIMESTAMP,
    dispute_raised BOOLEAN DEFAULT FALSE,
    dispute_reason TEXT,
    
    UNIQUE KEY unique_match_verification (match_id, participant_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    
    INDEX idx_match_verifications_match (match_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Match Disputes
CREATE TABLE IF NOT EXISTS match_disputes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    raised_by INT NOT NULL,
    dispute_type ENUM('score_incorrect', 'rule_violation', 'conduct', 'no_show', 'other') NOT NULL,
    description TEXT NOT NULL,
    evidence_files JSON,
    raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    assigned_to INT,
    status ENUM('pending', 'under_review', 'resolved', 'rejected') DEFAULT 'pending',
    resolution TEXT,
    resolved_at TIMESTAMP,
    resolved_by INT,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (raised_by) REFERENCES tournament_participants(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    
    INDEX idx_disputes_match (match_id),
    INDEX idx_disputes_status (status),
    INDEX idx_disputes_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 18. CHECK-IN & ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS match_checkins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qr_code_scanned VARCHAR(255),
    checkin_status ENUM('checked_in', 'absent', 'late') DEFAULT 'checked_in',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    UNIQUE KEY unique_match_player_checkin (match_id, player_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_checkins_match (match_id),
    INDEX idx_checkins_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 19. SOCIAL FEATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_follows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    notification_enabled BOOLEAN DEFAULT TRUE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_follows_follower (follower_id),
    INDEX idx_follows_following (following_id),
    
    CHECK (follower_id != following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 20. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('match_reminder', 'tournament_update', 'payment', 'general', 'referee_assignment', 'invitation', 'dispute', 'result') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    related_id INT,
    related_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_notifications_user (user_id, is_read),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_type_read (type, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel_email BOOLEAN DEFAULT TRUE,
    channel_push BOOLEAN DEFAULT TRUE,
    channel_sms BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    
    UNIQUE KEY unique_user_notification_type (user_id, notification_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_notif_prefs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Device Tokens for Push Notifications
CREATE TABLE IF NOT EXISTS device_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    push_token VARCHAR(500) NOT NULL,
    platform ENUM('android', 'ios', 'web') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_device (device_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_device_tokens_user (user_id),
    INDEX idx_device_tokens_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 21. SESSION MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (token),
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 22. AUDIT & LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_action (action),
    INDEX idx_audit_table (table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED DATA FOR SPORTS
-- =====================================================

INSERT IGNORE INTO sports (name, category, min_players_per_side, max_players_per_side, scoring_system, default_match_duration) VALUES
('Tennis', 'racquet', 1, 2, '{"sets":3,"games_per_set":6,"points":["0","15","30","40","game"]}', 120),
('Badminton', 'racquet', 1, 2, '{"sets":3,"points_per_set":21,"winning_margin":2}', 60),
('Table Tennis', 'racquet', 1, 2, '{"sets":5,"points_per_set":11,"winning_margin":2}', 45),
('Pickleball', 'racquet', 1, 2, '{"sets":3,"points_per_set":11,"winning_margin":2}', 30),
('Padel', 'racquet', 2, 2, '{"sets":3,"games_per_set":6,"points":["0","15","30","40","game"]}', 90),
('Squash', 'racquet', 1, 1, '{"sets":5,"points_per_set":11,"winning_margin":2}', 45),
('Volleyball', 'team', 6, 6, '{"sets":5,"points_per_set":25,"winning_margin":2,"deciding_set_points":15}', 90),
('Football', 'team', 11, 11, '{"periods":2,"period_duration":45,"extra_time":30}', 90);

-- =====================================================
-- ADDITIONAL TABLES BASED ON SP_UPDATED REQUIREMENTS
-- =====================================================

-- NEW: Referee Assignment Requests (Accept/Decline Workflow)
CREATE TABLE IF NOT EXISTS referee_assignment_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    referee_id INT NOT NULL,
    assigned_by INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined', 'cancelled') DEFAULT 'pending',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    decline_reason TEXT,
    notification_sent BOOLEAN DEFAULT FALSE,
    
    UNIQUE KEY unique_match_referee_assignment (match_id, referee_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    
    INDEX idx_referee_requests_match (match_id),
    INDEX idx_referee_requests_referee (referee_id),
    INDEX idx_referee_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Multi-Role Conflict Prevention
CREATE TABLE IF NOT EXISTS player_role_conflicts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    match_id INT NOT NULL,
    conflict_type ENUM('playing_and_refereeing', 'double_booking', 'rest_time_violation', 'own_match_referee') NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_action TEXT,
    
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    
    INDEX idx_conflicts_player (player_id),
    INDEX idx_conflicts_match (match_id),
    INDEX idx_conflicts_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Refund Policy Rules
CREATE TABLE IF NOT EXISTS refund_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    cancellation_window_hours INT NOT NULL,  -- Hours before tournament start
    refund_percentage DECIMAL(5,2) NOT NULL,  -- 0-100
    policy_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    INDEX idx_refund_policies_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Refund Requests
CREATE TABLE IF NOT EXISTS refund_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    participant_id INT NOT NULL,
    tournament_id INT NOT NULL,
    requested_amount DECIMAL(10,2) NOT NULL,
    refund_percentage DECIMAL(5,2) NOT NULL,
    reason ENUM('tournament_cancelled', 'player_withdrawal', 'duplicate_payment', 'other') NOT NULL,
    reason_details TEXT,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by INT,
    
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    
    INDEX idx_refund_requests_payment (payment_id),
    INDEX idx_refund_requests_tournament (tournament_id),
    INDEX idx_refund_requests_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Emergency Referee Pool (Spectators who can referee)
CREATE TABLE IF NOT EXISTS emergency_referee_pool (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    user_id INT NOT NULL,
    sport_id INT NOT NULL,
    availability_status ENUM('available', 'busy', 'unavailable') DEFAULT 'available',
    experience_level ENUM('none', 'beginner', 'intermediate', 'experienced') DEFAULT 'none',
    matches_refereed INT DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100.00,
    added_by INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_tournament_emergency_referee (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    FOREIGN KEY (added_by) REFERENCES users(id),
    
    INDEX idx_emergency_pool_tournament (tournament_id),
    INDEX idx_emergency_pool_availability (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Tournament Quality Control Violations
CREATE TABLE IF NOT EXISTS tournament_violations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    violation_type ENUM('account_age', 'incomplete_profile', 'payment_method', 'conduct', 'fraud', 'other') NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    reported_by INT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken ENUM('warning', 'suspension', 'cancellation', 'none') DEFAULT 'none',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    
    INDEX idx_violations_tournament (tournament_id),
    INDEX idx_violations_severity (severity),
    INDEX idx_violations_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Player Availability Marking
CREATE TABLE IF NOT EXISTS player_availability (
    id INT PRIMARY KEY AUTO_INCREMENT,
    player_id INT NOT NULL,
    tournament_id INT NOT NULL,
    unavailable_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    all_day BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_player_unavailable_slot (player_id, tournament_id, unavailable_date, start_time),
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    INDEX idx_player_availability_player (player_id),
    INDEX idx_player_availability_date (unavailable_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Dynamic Rescheduling Log
CREATE TABLE IF NOT EXISTS match_reschedule_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    old_date DATE,
    old_time TIME,
    new_date DATE,
    new_time TIME,
    old_court_id INT,
    new_court_id INT,
    reason ENUM('weather', 'delay', 'conflict', 'request', 'other') NOT NULL,
    reason_details TEXT,
    rescheduled_by INT NOT NULL,
    affected_players_notified BOOLEAN DEFAULT FALSE,
    rescheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (old_court_id) REFERENCES courts(id),
    FOREIGN KEY (new_court_id) REFERENCES courts(id),
    FOREIGN KEY (rescheduled_by) REFERENCES users(id),
    
    INDEX idx_reschedule_match (match_id),
    INDEX idx_reschedule_date (rescheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Tiebreaker Matches (Unplanned)
CREATE TABLE IF NOT EXISTS tiebreaker_matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    group_id INT,
    original_position INT NOT NULL,
    tied_participants JSON NOT NULL,  -- Array of participant IDs
    tiebreaker_criteria VARCHAR(255),
    status ENUM('pending', 'scheduled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES tournament_groups(id),
    
    INDEX idx_tiebreaker_tournament (tournament_id),
    INDEX idx_tiebreaker_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Tournament Creator Eligibility Check
CREATE TABLE IF NOT EXISTS tournament_creator_eligibility (
    user_id INT PRIMARY KEY,
    minimum_account_age_days INT DEFAULT 30,
    requires_verified_payment BOOLEAN DEFAULT TRUE,
    requires_complete_profile BOOLEAN DEFAULT TRUE,
    is_eligible BOOLEAN DEFAULT FALSE,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ineligibility_reasons JSON,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Escrow Account Tracking
CREATE TABLE IF NOT EXISTS escrow_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL UNIQUE,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    platform_commission DECIMAL(10,2) DEFAULT 0.00,
    prize_pool DECIMAL(10,2) DEFAULT 0.00,
    organizer_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('holding', 'released', 'refunded') DEFAULT 'holding',
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    INDEX idx_escrow_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Match Delay Tracking
CREATE TABLE IF NOT EXISTS match_delays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    delay_reason ENUM('weather', 'previous_match_overtime', 'player_late', 'technical', 'other') NOT NULL,
    delay_minutes INT NOT NULL,
    original_start_time DATETIME NOT NULL,
    new_start_time DATETIME NOT NULL,
    cascading_effect BOOLEAN DEFAULT FALSE,  -- Does it affect other matches?
    affected_matches_count INT DEFAULT 0,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    INDEX idx_delays_match (match_id),
    INDEX idx_delays_reason (delay_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: Tournament Analytics
CREATE TABLE IF NOT EXISTS tournament_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL UNIQUE,
    matches_scheduled INT DEFAULT 0,
    matches_completed INT DEFAULT 0,
    match_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    court_utilization_percentage DECIMAL(5,2) DEFAULT 0.00,
    average_match_duration INT DEFAULT 0,
    total_playing_time_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    INDEX idx_analytics_tournament (tournament_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Tournament Creator Dashboard Summary
CREATE OR REPLACE VIEW v_tournament_creator_dashboard AS
SELECT 
    t.id AS tournament_id,
    t.name AS tournament_name,
    t.organizer_id,
    t.status,
    t.start_date,
    t.end_date,
    COUNT(DISTINCT tp.id) AS total_participants,
    SUM(CASE WHEN tp.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_participants,
    t.total_collected,
    t.entry_fee,
    COUNT(DISTINCT m.id) AS total_matches,
    SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) AS completed_matches,
    COUNT(DISTINCT md.id) AS active_disputes,
    ta.court_utilization_percentage,
    ta.match_completion_rate
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
LEFT JOIN matches m ON t.id = m.tournament_id
LEFT JOIN match_disputes md ON m.id = md.match_id AND md.status IN ('pending', 'under_review')
LEFT JOIN tournament_analytics ta ON t.id = ta.tournament_id
WHERE t.deleted_at IS NULL
GROUP BY t.id;

-- View: Player Match Schedule with Role
CREATE OR REPLACE VIEW v_player_match_schedule AS
SELECT 
    ps.player_id,
    ps.match_id,
    ps.role,
    ps.scheduled_date,
    ps.scheduled_time,
    ps.end_time,
    m.tournament_id,
    t.name AS tournament_name,
    m.round_name,
    m.status AS match_status,
    c.name AS court_name,
    v.name AS venue_name
FROM player_schedule ps
JOIN matches m ON ps.match_id = m.id
JOIN tournaments t ON m.tournament_id = t.id
LEFT JOIN courts c ON m.court_id = c.id
LEFT JOIN venues v ON c.venue_id = v.id
WHERE ps.status = 'confirmed'
ORDER BY ps.scheduled_date, ps.scheduled_time;

-- View: Referee Workload Distribution
CREATE OR REPLACE VIEW v_referee_workload AS
SELECT 
    u.id AS referee_id,
    CONCAT(u.first_name, ' ', u.last_name) AS referee_name,
    COUNT(m.id) AS total_matches_assigned,
    SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) AS matches_completed,
    SUM(CASE WHEN rar.status = 'declined' THEN 1 ELSE 0 END) AS matches_declined,
    rp.reliability_score,
    rp.average_rating
FROM users u
LEFT JOIN matches m ON u.id = m.referee_id
LEFT JOIN referee_assignment_requests rar ON m.id = rar.match_id AND u.id = rar.referee_id
LEFT JOIN referee_performance rp ON u.id = rp.referee_id
WHERE u.role IN ('player', 'admin')
GROUP BY u.id;

-- View: Tournament Financial Summary
CREATE OR REPLACE VIEW v_tournament_financial_summary AS
SELECT 
    t.id AS tournament_id,
    t.name AS tournament_name,
    t.organizer_id,
    t.entry_fee,
    COUNT(DISTINCT tp.id) AS total_registrations,
    SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_collected,
    t.platform_commission_percent,
    (SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) * t.platform_commission_percent / 100) AS platform_commission,
    (SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) * (100 - t.platform_commission_percent) / 100) AS organizer_earnings,
    t.prize_money,
    ea.status AS escrow_status,
    tcw.balance AS wallet_balance
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
LEFT JOIN payments p ON tp.id = p.participant_id
LEFT JOIN escrow_accounts ea ON t.id = ea.tournament_id
LEFT JOIN tournament_creator_wallets tcw ON t.organizer_id = tcw.user_id
WHERE t.deleted_at IS NULL
GROUP BY t.id;

-- =====================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =====================================================

DELIMITER //

-- Procedure: Check Player Eligibility to Create Tournament
CREATE PROCEDURE sp_check_tournament_creator_eligibility(IN p_user_id INT)
BEGIN
    DECLARE v_account_age INT;
    DECLARE v_profile_complete INT;
    DECLARE v_payment_verified BOOLEAN;
    DECLARE v_is_eligible BOOLEAN DEFAULT FALSE;
    DECLARE v_reasons JSON;
    
    -- Calculate account age
    SELECT DATEDIFF(CURRENT_DATE, DATE(created_at)) INTO v_account_age
    FROM users WHERE id = p_user_id;
    
    -- Check profile completion
    SELECT profile_completion_percentage INTO v_profile_complete
    FROM users WHERE id = p_user_id;
    
    -- Check payment verification
    SELECT payment_method_verified INTO v_payment_verified
    FROM users WHERE id = p_user_id;
    
    -- Determine eligibility
    SET v_is_eligible = (v_account_age >= 30 AND v_profile_complete >= 80 AND v_payment_verified = TRUE);
    
    -- Build reasons JSON
    SET v_reasons = JSON_ARRAY();
    IF v_account_age < 30 THEN
        SET v_reasons = JSON_ARRAY_APPEND(v_reasons, '$', 'Account must be at least 30 days old');
    END IF;
    IF v_profile_complete < 80 THEN
        SET v_reasons = JSON_ARRAY_APPEND(v_reasons, '$', 'Profile must be at least 80% complete');
    END IF;
    IF v_payment_verified = FALSE THEN
        SET v_reasons = JSON_ARRAY_APPEND(v_reasons, '$', 'Payment method must be verified');
    END IF;
    
    -- Insert or update eligibility record
    INSERT IGNORE INTO tournament_creator_eligibility (user_id, is_eligible, ineligibility_reasons)
    VALUES (p_user_id, v_is_eligible, v_reasons)
    ON DUPLICATE KEY UPDATE 
        is_eligible = v_is_eligible,
        ineligibility_reasons = v_reasons,
        last_checked = CURRENT_TIMESTAMP;
    
    -- Return result
    SELECT v_is_eligible AS is_eligible, v_reasons AS reasons;
END //

-- Procedure: Detect Multi-Role Conflicts
CREATE PROCEDURE sp_detect_role_conflicts(IN p_match_id INT, IN p_referee_id INT)
BEGIN
    DECLARE v_conflict_exists BOOLEAN DEFAULT FALSE;
    DECLARE v_conflict_type VARCHAR(50);
    
    -- Check if referee is also playing in this match
    IF EXISTS (
        SELECT 1 FROM matches m
        JOIN tournament_participants tp ON (m.participant1_id = tp.id OR m.participant2_id = tp.id)
        WHERE m.id = p_match_id AND tp.user_id = p_referee_id
    ) THEN
        SET v_conflict_exists = TRUE;
        SET v_conflict_type = 'own_match_referee';
        
        INSERT IGNORE INTO player_role_conflicts (player_id, match_id, conflict_type)
        VALUES (p_referee_id, p_match_id, v_conflict_type);
    END IF;
    
    -- Check if referee is playing another match at same time
    IF EXISTS (
        SELECT 1 FROM matches m1
        JOIN matches m2 ON m1.match_date = m2.match_date AND m1.match_time = m2.match_time
        JOIN player_schedule ps ON m2.id = ps.match_id
        WHERE m1.id = p_match_id 
        AND ps.player_id = p_referee_id 
        AND ps.role = 'participant'
        AND m1.id != m2.id
    ) THEN
        SET v_conflict_exists = TRUE;
        SET v_conflict_type = 'playing_and_refereeing';
        
        INSERT IGNORE INTO player_role_conflicts (player_id, match_id, conflict_type)
        VALUES (p_referee_id, p_match_id, v_conflict_type);
    END IF;
    
    SELECT v_conflict_exists AS has_conflict, v_conflict_type AS conflict_type;
END //

-- Procedure: Calculate Refund Amount
CREATE PROCEDURE sp_calculate_refund_amount(
    IN p_tournament_id INT,
    IN p_participant_id INT,
    OUT p_refund_amount DECIMAL(10,2),
    OUT p_refund_percentage DECIMAL(5,2)
)
BEGIN
    DECLARE v_entry_fee DECIMAL(10,2);
    DECLARE v_start_date DATE;
    DECLARE v_hours_until_start INT;
    
    -- Get tournament details
    SELECT entry_fee, start_date INTO v_entry_fee, v_start_date
    FROM tournaments WHERE id = p_tournament_id;
    
    -- Calculate hours until tournament start
    SET v_hours_until_start = TIMESTAMPDIFF(HOUR, NOW(), CONCAT(v_start_date, ' 00:00:00'));
    
    -- Apply refund policy
    IF v_hours_until_start >= 24 THEN
        SET p_refund_percentage = 100.00;
    ELSEIF v_hours_until_start >= 1 THEN
        SET p_refund_percentage = 50.00;
    ELSE
        SET p_refund_percentage = 0.00;
    END IF;
    
    SET p_refund_amount = v_entry_fee * p_refund_percentage / 100;
END //

DELIMITER ;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

DELIMITER //

-- Trigger: Update account age daily
CREATE TRIGGER trg_update_account_age
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.account_age_days = DATEDIFF(CURRENT_DATE, DATE(NEW.created_at));
END //

-- Trigger: Update tournament analytics on match completion
CREATE TRIGGER trg_update_tournament_analytics_on_match
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE tournament_analytics
        SET matches_completed = matches_completed + 1,
            match_completion_rate = (matches_completed + 1) * 100.0 / NULLIF(matches_scheduled, 0)
        WHERE tournament_id = NEW.tournament_id;
    END IF;
END //

-- Trigger: Update wallet on payment completion
CREATE TRIGGER trg_update_wallet_on_payment
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    DECLARE v_organizer_id INT;
    DECLARE v_commission_percent DECIMAL(5,2);
    DECLARE v_organizer_amount DECIMAL(10,2);
    
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get tournament organizer and commission
        SELECT organizer_id, platform_commission_percent 
        INTO v_organizer_id, v_commission_percent
        FROM tournaments WHERE id = NEW.tournament_id;
        
        -- Calculate organizer amount
        SET v_organizer_amount = NEW.amount * (100 - v_commission_percent) / 100;
        
        -- Update wallet
        INSERT IGNORE INTO tournament_creator_wallets (user_id, balance, total_earned)
        VALUES (v_organizer_id, v_organizer_amount, v_organizer_amount)
        ON DUPLICATE KEY UPDATE
            balance = balance + v_organizer_amount,
            total_earned = total_earned + v_organizer_amount;
            
        -- Log transaction
        INSERT IGNORE INTO wallet_transactions (
            wallet_id, tournament_id, payment_id, participant_id,
            transaction_type, amount, commission_percentage, balance_after, description
        )
        SELECT 
            id, NEW.tournament_id, NEW.id, NEW.participant_id,
            'credit', v_organizer_amount, v_commission_percent, balance,
            CONCAT('Registration fee from tournament #', NEW.tournament_id)
        FROM tournament_creator_wallets WHERE user_id = v_organizer_id;
    END IF;
END //

-- Trigger: Update referee performance on match completion
DROP TRIGGER IF EXISTS trg_update_referee_performance //
CREATE TRIGGER trg_update_referee_performance
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.referee_id IS NOT NULL THEN
        INSERT IGNORE INTO referee_performance (referee_id, total_matches_assigned, matches_completed)
        VALUES (NEW.referee_id, 1, 1)
        ON DUPLICATE KEY UPDATE
            matches_completed = matches_completed + 1,
            total_matches_assigned = GREATEST(total_matches_assigned, matches_completed + 1),
            reliability_score = LEAST(100.00, (matches_completed + 1) * 100.0 / GREATEST(total_matches_assigned, matches_completed + 1)),
            last_match_date = NEW.match_date;
    END IF;
END //

DELIMITER ;

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_matches_tournament_status_date ON matches(tournament_id, status, match_date);
CREATE INDEX idx_payments_tournament_status ON payments(tournament_id, status);
CREATE INDEX idx_participants_tournament_payment ON tournament_participants(tournament_id, payment_status);
CREATE INDEX idx_player_schedule_date_role ON player_schedule(scheduled_date, role, status);

-- =====================================================
-- SCORING SYSTEM ENHANCEMENTS
-- =====================================================

-- 1. Live Match State - Track real-time match progress
CREATE TABLE IF NOT EXISTS live_match_state (
    match_id INT PRIMARY KEY,
    sport_id INT NOT NULL,
    current_period INT DEFAULT 1,  -- Set/Game/Half number
    period_type VARCHAR(20) DEFAULT 'regular',  -- 'regular', 'extra_time', 'tiebreak', 'penalty'
    
    -- Current Score (Sport-specific JSON structure)
    participant1_score JSON NOT NULL,
    participant2_score JSON NOT NULL,
    
    -- Current Server/Possession
    current_server INT,  -- player_id or team_id
    server_position INT,  -- For volleyball rotation
    
    -- Time Tracking
    period_start_time DATETIME,
    elapsed_time_seconds INT DEFAULT 0,
    stoppage_time_seconds INT DEFAULT 0,
    
    -- Match Status
    is_live BOOLEAN DEFAULT TRUE,
    is_paused BOOLEAN DEFAULT FALSE,
    pause_reason VARCHAR(100),
    
    -- Last Event
    last_event_id INT,
    last_event_time DATETIME,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    FOREIGN KEY (last_event_id) REFERENCES scoring_events(id),
    
    INDEX idx_live_matches (is_live),
    INDEX idx_sport_live (sport_id, is_live)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Enhanced Scoring Events - Add sport-specific fields
ALTER TABLE scoring_events
ADD COLUMN sport_id INT AFTER match_id,
ADD COLUMN period_number INT DEFAULT 1 COMMENT 'Set/Game/Half number',
ADD COLUMN period_type VARCHAR(20) DEFAULT 'regular' COMMENT 'regular, extra_time, tiebreak, penalty',
ADD COLUMN score_before JSON COMMENT 'Score before this event',
ADD COLUMN score_after JSON COMMENT 'Score after this event',
ADD COLUMN player_id INT COMMENT 'Individual player who scored/acted',
ADD COLUMN team_id INT COMMENT 'Team (for team sports)',
ADD COLUMN point_value INT DEFAULT 1 COMMENT 'Points awarded',
ADD COLUMN is_critical BOOLEAN DEFAULT FALSE COMMENT 'Match point, set point, etc.',
ADD FOREIGN KEY (sport_id) REFERENCES sports(id),
ADD FOREIGN KEY (player_id) REFERENCES users(id),
ADD FOREIGN KEY (team_id) REFERENCES teams(id),
ADD INDEX idx_scoring_sport (sport_id),
ADD INDEX idx_scoring_player (player_id),
ADD INDEX idx_scoring_period (match_id, period_number);

-- 3. Match Timeline - Complete event sequence for replay
CREATE TABLE IF NOT EXISTS match_timeline (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    sequence_number INT NOT NULL,
    event_time DATETIME NOT NULL,
    elapsed_seconds INT COMMENT 'Seconds from match start',
    
    event_category ENUM('score', 'card', 'substitution', 'timeout', 'injury', 'other') NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    event_data JSON,
    
    participant_id INT COMMENT 'Who performed the action',
    affected_participant_id INT COMMENT 'Who was affected',
    
    score_impact BOOLEAN DEFAULT FALSE,
    score_after JSON,
    
    video_timestamp INT COMMENT 'For video replay sync',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_match_sequence (match_id, sequence_number),
    INDEX idx_match_timeline (match_id, sequence_number),
    INDEX idx_timeline_time (match_id, event_time),
    INDEX idx_timeline_category (match_id, event_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Sport Scoring Configuration - Detailed sport rules
CREATE TABLE IF NOT EXISTS sport_scoring_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sport_id INT NOT NULL,
    config_name VARCHAR(100) NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    UNIQUE KEY unique_sport_config (sport_id, config_name),
    INDEX idx_sport_config (sport_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Player Sport Performance - Aggregated stats across matches
CREATE TABLE IF NOT EXISTS player_sport_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sport_id INT NOT NULL,
    tournament_id INT,
    
    -- Aggregated Stats
    total_matches INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    total_points_scored INT DEFAULT 0,
    total_points_conceded INT DEFAULT 0,
    
    -- Sport-specific aggregations
    sport_specific_stats JSON,
    
    -- Performance Metrics
    average_score_per_match DECIMAL(10,2),
    win_percentage DECIMAL(5,2),
    performance_rating DECIMAL(5,2) COMMENT 'Calculated rating',
    
    -- Time Period
    season VARCHAR(20),
    last_match_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_player_sport_tournament (user_id, sport_id, tournament_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    
    INDEX idx_player_sport (user_id, sport_id),
    INDEX idx_performance_rating (performance_rating DESC),
    INDEX idx_sport_performance (sport_id, performance_rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Match Momentum Tracking - Track momentum shifts
CREATE TABLE IF NOT EXISTS match_momentum (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    period_number INT,
    
    participant1_momentum DECIMAL(5,2) COMMENT '-100 to +100',
    participant2_momentum DECIMAL(5,2),
    
    momentum_shift VARCHAR(20) COMMENT 'gaining, losing, stable',
    trigger_event_id INT COMMENT 'Event that caused shift',
    
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (trigger_event_id) REFERENCES scoring_events(id),
    
    INDEX idx_momentum_match (match_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED DATA FOR SPORT SCORING CONFIGURATIONS
-- =====================================================

-- Tennis Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(1, 'point_progression', '["0", "15", "30", "40", "game"]', 'Tennis point system'),
(1, 'deuce_rule', '{"enabled": true, "advantage": true}', 'Deuce and advantage rule'),
(1, 'tiebreak_rule', '{"at_score": "6-6", "points_to_win": 7, "win_by": 2}', 'Tiebreak rules'),
(1, 'sets_to_win', '{"best_of": 3, "sets_required": 2}', 'Match format');

-- Badminton Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(2, 'rally_point', '{"enabled": true, "every_rally_scores": true}', 'Rally point system'),
(2, 'game_points', '{"points_to_win": 21, "win_by": 2, "max_points": 30}', 'Game scoring'),
(2, 'games_to_win', '{"best_of": 3, "games_required": 2}', 'Match format');

-- Table Tennis Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(3, 'rally_point', '{"enabled": true}', 'Rally point system'),
(3, 'game_points', '{"points_to_win": 11, "win_by": 2}', 'Game scoring'),
(3, 'service_rotation', '{"points_per_rotation": 2, "deuce_rotation": 1}', 'Service rules');

-- Pickleball Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(4, 'serving_team_scores', '{"enabled": true}', 'Only serving team scores'),
(4, 'game_points', '{"points_to_win": 11, "win_by": 2}', 'Game scoring'),
(4, 'doubles_serves', '{"two_serves_per_side": true, "first_service_exception": true}', 'Doubles serving');

-- Padel Configuration (Same as Tennis)
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(5, 'point_progression', '["0", "15", "30", "40", "game"]', 'Padel point system'),
(5, 'doubles_only', '{"required": true}', 'Always played in doubles'),
(5, 'tiebreak_rule', '{"at_score": "6-6", "points_to_win": 7, "win_by": 2}', 'Tiebreak rules');

-- Squash Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(6, 'rally_point', '{"enabled": true}', 'Rally point system'),
(6, 'game_points', '{"points_to_win": 11, "win_by": 2}', 'Game scoring'),
(6, 'games_to_win', '{"best_of": 5, "games_required": 3}', 'Match format');

-- Volleyball Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(7, 'rally_point', '{"enabled": true}', 'Rally point system'),
(7, 'set_points', '{"points_to_win": 25, "win_by": 2, "deciding_set_points": 15}', 'Set scoring'),
(7, 'rotation_system', '{"enabled": true, "clockwise": true}', 'Player rotation');

-- Football Configuration
INSERT IGNORE INTO sport_scoring_config (sport_id, config_name, config_value, description) VALUES
(8, 'match_duration', '{"periods": 2, "period_minutes": 45, "half_time_minutes": 15}', 'Match timing'),
(8, 'extra_time', '{"periods": 2, "period_minutes": 15}', 'Extra time rules'),
(8, 'penalty_shootout', '{"enabled": true, "initial_kicks": 5, "sudden_death": true}', 'Penalty rules'),
(8, 'substitutions', '{"max_allowed": 5, "extra_time_additional": 1}', 'Substitution rules');

-- =====================================================
-- VIEWS FOR SCORING ANALYSIS
-- =====================================================

-- View: Live Matches Dashboard
CREATE OR REPLACE VIEW v_live_matches AS
SELECT 
    m.id AS match_id,
    t.name AS tournament_name,
    s.name AS sport_name,
    lms.current_period,
    lms.period_type,
    lms.participant1_score,
    lms.participant2_score,
    lms.elapsed_time_seconds,
    lms.is_paused,
    m.match_date,
    m.match_time,
    v.name AS venue_name,
    c.name AS court_name
FROM live_match_state lms
JOIN matches m ON lms.match_id = m.id
JOIN tournaments t ON m.tournament_id = t.id
JOIN sports s ON lms.sport_id = s.id
LEFT JOIN venues v ON m.venue_id = v.id
LEFT JOIN courts c ON m.court_id = c.id
WHERE lms.is_live = TRUE
ORDER BY m.match_date, m.match_time;

-- View: Player Performance Summary
CREATE OR REPLACE VIEW v_player_performance_summary AS
SELECT 
    u.id AS user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS player_name,
    s.name AS sport_name,
    psp.total_matches,
    psp.total_wins,
    psp.total_losses,
    psp.win_percentage,
    psp.performance_rating,
    psp.average_score_per_match,
    psp.sport_specific_stats,
    psp.last_match_date
FROM player_sport_performance psp
JOIN users u ON psp.user_id = u.id
JOIN sports s ON psp.sport_id = s.id
ORDER BY s.id, psp.performance_rating DESC;

-- View: Match Timeline Summary
CREATE OR REPLACE VIEW v_match_timeline_summary AS
SELECT 
    mt.match_id,
    COUNT(*) AS total_events,
    SUM(CASE WHEN mt.event_category = 'score' THEN 1 ELSE 0 END) AS scoring_events,
    SUM(CASE WHEN mt.event_category = 'card' THEN 1 ELSE 0 END) AS card_events,
    SUM(CASE WHEN mt.event_category = 'substitution' THEN 1 ELSE 0 END) AS substitution_events,
    MIN(mt.event_time) AS first_event_time,
    MAX(mt.event_time) AS last_event_time,
    MAX(mt.elapsed_seconds) AS match_duration_seconds
FROM match_timeline mt
GROUP BY mt.match_id;

-- =====================================================
-- STORED PROCEDURES FOR SCORING
-- =====================================================

DELIMITER //

-- Procedure: Start Match and Initialize Live State
CREATE PROCEDURE sp_start_match(
    IN p_match_id INT,
    IN p_sport_id INT
)
BEGIN
    DECLARE v_initial_score JSON;
    
    -- Set initial score based on sport
    SET v_initial_score = JSON_OBJECT(
        'score', 0,
        'period', 1
    );
    
    -- Insert live match state
    INSERT IGNORE INTO live_match_state (
        match_id,
        sport_id,
        participant1_score,
        participant2_score,
        period_start_time,
        is_live
    ) VALUES (
        p_match_id,
        p_sport_id,
        v_initial_score,
        v_initial_score,
        NOW(),
        TRUE
    );
    
    -- Update match status
    UPDATE matches 
    SET status = 'in_progress',
        actual_start_time = NOW()
    WHERE id = p_match_id;
    
    SELECT 'Match started successfully' AS message;
END //

-- Procedure: Record Scoring Event
CREATE PROCEDURE sp_record_score_event(
    IN p_match_id INT,
    IN p_event_type VARCHAR(50),
    IN p_player_id INT,
    IN p_event_data JSON,
    OUT p_event_id INT
)
BEGIN
    DECLARE v_sport_id INT;
    DECLARE v_period_number INT;
    DECLARE v_score_before JSON;
    
    -- Get current match state
    SELECT sport_id, current_period, participant1_score
    INTO v_sport_id, v_period_number, v_score_before
    FROM live_match_state
    WHERE match_id = p_match_id;
    
    -- Insert scoring event
    INSERT IGNORE INTO scoring_events (
        match_id,
        sport_id,
        event_type,
        event_data,
        period_number,
        score_before,
        player_id,
        scorer_id
    ) VALUES (
        p_match_id,
        v_sport_id,
        p_event_type,
        p_event_data,
        v_period_number,
        v_score_before,
        p_player_id,
        p_player_id
    );
    
    SET p_event_id = LAST_INSERT_ID();
    
    -- Update live match state
    UPDATE live_match_state
    SET last_event_id = p_event_id,
        last_event_time = NOW()
    WHERE match_id = p_match_id;
    
    SELECT p_event_id AS event_id;
END //

-- Procedure: Complete Match
CREATE PROCEDURE sp_complete_match_scoring(
    IN p_match_id INT,
    IN p_winner_participant_id INT,
    IN p_final_score JSON
)
BEGIN
    -- Update match
    UPDATE matches
    SET status = 'completed',
        winner_participant_id = p_winner_participant_id,
        score = p_final_score,
        actual_end_time = NOW()
    WHERE id = p_match_id;
    
    -- Update live state
    UPDATE live_match_state
    SET is_live = FALSE
    WHERE match_id = p_match_id;
    
    SELECT 'Match completed successfully' AS message;
END //

DELIMITER ;

-- =====================================================
-- ADDITIONAL INDEXES FOR SCORING PERFORMANCE
-- =====================================================

CREATE INDEX idx_live_state_sport_period ON live_match_state(sport_id, current_period);
CREATE INDEX idx_timeline_event_type ON match_timeline(match_id, event_type);
CREATE INDEX idx_performance_sport_rating ON player_sport_performance(sport_id, performance_rating DESC);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
