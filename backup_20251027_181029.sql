-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: sports_tournament_db_v2
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.24.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `achievements`
--

DROP TABLE IF EXISTS `achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `badge_icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('participation','performance','milestone','special') COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria` json DEFAULT NULL,
  `points` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `achievements`
--

LOCK TABLES `achievements` WRITE;
/*!40000 ALTER TABLE `achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_table` (`table_name`,`record_id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `court_availability`
--

DROP TABLE IF EXISTS `court_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `court_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `court_id` int NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `booking_type` enum('tournament','maintenance','private','blocked') COLLATE utf8mb4_unicode_ci DEFAULT 'tournament',
  `tournament_id` int DEFAULT NULL,
  `match_id` int DEFAULT NULL,
  `booked_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_court_slot` (`court_id`,`date`,`start_time`,`end_time`),
  KEY `booked_by` (`booked_by`),
  KEY `idx_court_availability_date` (`court_id`,`date`),
  KEY `idx_court_availability_tournament` (`tournament_id`),
  KEY `fk_court_availability_match` (`match_id`),
  CONSTRAINT `court_availability_ibfk_1` FOREIGN KEY (`court_id`) REFERENCES `courts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `court_availability_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `court_availability_ibfk_3` FOREIGN KEY (`booked_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_court_availability_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `court_availability`
--

LOCK TABLES `court_availability` WRITE;
/*!40000 ALTER TABLE `court_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `court_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courts`
--

DROP TABLE IF EXISTS `courts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venue_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `court_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `surface_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dimensions` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sport_ids` json DEFAULT NULL,
  `features` json DEFAULT NULL,
  `hourly_rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_available` tinyint(1) NOT NULL DEFAULT '1',
  `maintenance_schedule` json DEFAULT NULL,
  `images` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_courts_venue` (`venue_id`),
  KEY `idx_courts_available` (`is_available`),
  CONSTRAINT `courts_ibfk_1` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courts`
--

LOCK TABLES `courts` WRITE;
/*!40000 ALTER TABLE `courts` DISABLE KEYS */;
/*!40000 ALTER TABLE `courts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_tokens`
--

DROP TABLE IF EXISTS `device_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `push_token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('android','ios','web') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_device` (`device_id`),
  KEY `idx_device_tokens_user` (`user_id`),
  KEY `idx_device_tokens_active` (`is_active`),
  CONSTRAINT `device_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_tokens`
--

LOCK TABLES `device_tokens` WRITE;
/*!40000 ALTER TABLE `device_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emergency_referee_pool`
--

DROP TABLE IF EXISTS `emergency_referee_pool`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emergency_referee_pool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `user_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `availability_status` enum('available','busy','unavailable') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `experience_level` enum('none','beginner','intermediate','experienced') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `matches_refereed` int DEFAULT '0',
  `reliability_score` decimal(5,2) DEFAULT '100.00',
  `added_by` int NOT NULL,
  `added_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_emergency_referee` (`tournament_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `sport_id` (`sport_id`),
  KEY `added_by` (`added_by`),
  KEY `idx_emergency_pool_tournament` (`tournament_id`),
  KEY `idx_emergency_pool_availability` (`availability_status`),
  CONSTRAINT `emergency_referee_pool_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emergency_referee_pool_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `emergency_referee_pool_ibfk_3` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`),
  CONSTRAINT `emergency_referee_pool_ibfk_4` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emergency_referee_pool`
--

LOCK TABLES `emergency_referee_pool` WRITE;
/*!40000 ALTER TABLE `emergency_referee_pool` DISABLE KEYS */;
/*!40000 ALTER TABLE `emergency_referee_pool` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `escrow_accounts`
--

DROP TABLE IF EXISTS `escrow_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `escrow_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `platform_commission` decimal(10,2) DEFAULT '0.00',
  `prize_pool` decimal(10,2) DEFAULT '0.00',
  `organizer_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('holding','released','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'holding',
  `released_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tournament_id` (`tournament_id`),
  KEY `idx_escrow_status` (`status`),
  CONSTRAINT `escrow_accounts_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `escrow_accounts`
--

LOCK TABLES `escrow_accounts` WRITE;
/*!40000 ALTER TABLE `escrow_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `escrow_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_participants`
--

DROP TABLE IF EXISTS `group_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `position` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_participant` (`group_id`,`participant_id`),
  KEY `idx_group_participants_group` (`group_id`),
  KEY `fk_group_participants_participant` (`participant_id`),
  CONSTRAINT `fk_group_participants_participant` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_participants_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `tournament_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_participants`
--

LOCK TABLES `group_participants` WRITE;
/*!40000 ALTER TABLE `group_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ladder_challenges`
--

DROP TABLE IF EXISTS `ladder_challenges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ladder_challenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `challenger_id` int NOT NULL,
  `challenged_id` int NOT NULL,
  `challenge_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `proposed_match_date` datetime DEFAULT NULL,
  `match_id` int DEFAULT NULL,
  `status` enum('pending','accepted','declined','completed','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `challenger_rank_at_time` int DEFAULT NULL,
  `challenged_rank_at_time` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `match_id` (`match_id`),
  KEY `idx_challenges_tournament` (`tournament_id`),
  KEY `idx_challenges_status` (`status`),
  KEY `idx_challenges_challenger` (`challenger_id`),
  KEY `idx_challenges_challenged` (`challenged_id`),
  CONSTRAINT `ladder_challenges_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ladder_challenges_ibfk_2` FOREIGN KEY (`challenger_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ladder_challenges_ibfk_3` FOREIGN KEY (`challenged_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ladder_challenges_ibfk_4` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ladder_challenges`
--

LOCK TABLES `ladder_challenges` WRITE;
/*!40000 ALTER TABLE `ladder_challenges` DISABLE KEYS */;
/*!40000 ALTER TABLE `ladder_challenges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ladder_rankings`
--

DROP TABLE IF EXISTS `ladder_rankings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ladder_rankings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `current_rank` int NOT NULL,
  `previous_rank` int DEFAULT NULL,
  `points` int DEFAULT '0',
  `challenges_issued` int DEFAULT '0',
  `challenges_won` int DEFAULT '0',
  `challenges_lost` int DEFAULT '0',
  `last_match_date` date DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_ladder_participant` (`tournament_id`,`participant_id`),
  UNIQUE KEY `unique_tournament_rank` (`tournament_id`,`current_rank`),
  KEY `participant_id` (`participant_id`),
  KEY `idx_ladder_tournament` (`tournament_id`),
  KEY `idx_ladder_rank` (`tournament_id`,`current_rank`),
  CONSTRAINT `ladder_rankings_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ladder_rankings_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ladder_rankings`
--

LOCK TABLES `ladder_rankings` WRITE;
/*!40000 ALTER TABLE `ladder_rankings` DISABLE KEYS */;
/*!40000 ALTER TABLE `ladder_rankings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `live_match_state`
--

DROP TABLE IF EXISTS `live_match_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `live_match_state` (
  `match_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `current_period` int DEFAULT '1',
  `period_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'regular',
  `participant1_score` json NOT NULL,
  `participant2_score` json NOT NULL,
  `current_server` int DEFAULT NULL,
  `server_position` int DEFAULT NULL,
  `period_start_time` datetime DEFAULT NULL,
  `elapsed_time_seconds` int DEFAULT '0',
  `stoppage_time_seconds` int DEFAULT '0',
  `is_live` tinyint(1) DEFAULT '1',
  `is_paused` tinyint(1) DEFAULT '0',
  `pause_reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_event_id` int DEFAULT NULL,
  `last_event_time` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`match_id`),
  KEY `last_event_id` (`last_event_id`),
  KEY `idx_live_matches` (`is_live`),
  KEY `idx_sport_live` (`sport_id`,`is_live`),
  KEY `idx_live_state_sport_period` (`sport_id`,`current_period`),
  CONSTRAINT `live_match_state_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `live_match_state_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`),
  CONSTRAINT `live_match_state_ibfk_3` FOREIGN KEY (`last_event_id`) REFERENCES `scoring_events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `live_match_state`
--

LOCK TABLES `live_match_state` WRITE;
/*!40000 ALTER TABLE `live_match_state` DISABLE KEYS */;
/*!40000 ALTER TABLE `live_match_state` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lucky_losers`
--

DROP TABLE IF EXISTS `lucky_losers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lucky_losers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `eliminated_in_round` int DEFAULT NULL,
  `ranking_points` int DEFAULT '0',
  `available_for_replacement` tinyint(1) DEFAULT '1',
  `replaced_participant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `participant_id` (`participant_id`),
  KEY `replaced_participant_id` (`replaced_participant_id`),
  KEY `idx_lucky_losers_tournament` (`tournament_id`),
  KEY `idx_lucky_losers_available` (`available_for_replacement`),
  CONSTRAINT `lucky_losers_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lucky_losers_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lucky_losers_ibfk_3` FOREIGN KEY (`replaced_participant_id`) REFERENCES `tournament_participants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lucky_losers`
--

LOCK TABLES `lucky_losers` WRITE;
/*!40000 ALTER TABLE `lucky_losers` DISABLE KEYS */;
/*!40000 ALTER TABLE `lucky_losers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_checkins`
--

DROP TABLE IF EXISTS `match_checkins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_checkins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `player_id` int NOT NULL,
  `checkin_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `qr_code_scanned` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checkin_status` enum('checked_in','absent','late') COLLATE utf8mb4_unicode_ci DEFAULT 'checked_in',
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_match_player_checkin` (`match_id`,`player_id`),
  KEY `idx_checkins_match` (`match_id`),
  KEY `idx_checkins_player` (`player_id`),
  CONSTRAINT `match_checkins_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_checkins_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_checkins`
--

LOCK TABLES `match_checkins` WRITE;
/*!40000 ALTER TABLE `match_checkins` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_checkins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_delays`
--

DROP TABLE IF EXISTS `match_delays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_delays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `delay_reason` enum('weather','previous_match_overtime','player_late','technical','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `delay_minutes` int NOT NULL,
  `original_start_time` datetime NOT NULL,
  `new_start_time` datetime NOT NULL,
  `cascading_effect` tinyint(1) DEFAULT '0',
  `affected_matches_count` int DEFAULT '0',
  `logged_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delays_match` (`match_id`),
  KEY `idx_delays_reason` (`delay_reason`),
  CONSTRAINT `match_delays_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_delays`
--

LOCK TABLES `match_delays` WRITE;
/*!40000 ALTER TABLE `match_delays` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_delays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_disputes`
--

DROP TABLE IF EXISTS `match_disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_disputes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `raised_by` int NOT NULL,
  `dispute_type` enum('score_incorrect','rule_violation','conduct','no_show','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence_files` json DEFAULT NULL,
  `raised_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` int DEFAULT NULL,
  `status` enum('pending','under_review','resolved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `raised_by` (`raised_by`),
  KEY `resolved_by` (`resolved_by`),
  KEY `idx_disputes_match` (`match_id`),
  KEY `idx_disputes_status` (`status`),
  KEY `idx_disputes_assigned` (`assigned_to`),
  CONSTRAINT `match_disputes_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_disputes_ibfk_2` FOREIGN KEY (`raised_by`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `match_disputes_ibfk_3` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`),
  CONSTRAINT `match_disputes_ibfk_4` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_disputes`
--

LOCK TABLES `match_disputes` WRITE;
/*!40000 ALTER TABLE `match_disputes` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_disputes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_momentum`
--

DROP TABLE IF EXISTS `match_momentum`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_momentum` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `timestamp` datetime NOT NULL,
  `period_number` int DEFAULT NULL,
  `participant1_momentum` decimal(5,2) DEFAULT NULL COMMENT '-100 to +100',
  `participant2_momentum` decimal(5,2) DEFAULT NULL,
  `momentum_shift` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'gaining, losing, stable',
  `trigger_event_id` int DEFAULT NULL COMMENT 'Event that caused shift',
  PRIMARY KEY (`id`),
  KEY `trigger_event_id` (`trigger_event_id`),
  KEY `idx_momentum_match` (`match_id`,`timestamp`),
  CONSTRAINT `match_momentum_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_momentum_ibfk_2` FOREIGN KEY (`trigger_event_id`) REFERENCES `scoring_events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_momentum`
--

LOCK TABLES `match_momentum` WRITE;
/*!40000 ALTER TABLE `match_momentum` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_momentum` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_reschedule_history`
--

DROP TABLE IF EXISTS `match_reschedule_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_reschedule_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `old_date` date DEFAULT NULL,
  `old_time` time DEFAULT NULL,
  `new_date` date DEFAULT NULL,
  `new_time` time DEFAULT NULL,
  `old_court_id` int DEFAULT NULL,
  `new_court_id` int DEFAULT NULL,
  `reason` enum('weather','delay','conflict','request','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_details` text COLLATE utf8mb4_unicode_ci,
  `rescheduled_by` int NOT NULL,
  `affected_players_notified` tinyint(1) DEFAULT '0',
  `rescheduled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `old_court_id` (`old_court_id`),
  KEY `new_court_id` (`new_court_id`),
  KEY `rescheduled_by` (`rescheduled_by`),
  KEY `idx_reschedule_match` (`match_id`),
  KEY `idx_reschedule_date` (`rescheduled_at`),
  CONSTRAINT `match_reschedule_history_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_reschedule_history_ibfk_2` FOREIGN KEY (`old_court_id`) REFERENCES `courts` (`id`),
  CONSTRAINT `match_reschedule_history_ibfk_3` FOREIGN KEY (`new_court_id`) REFERENCES `courts` (`id`),
  CONSTRAINT `match_reschedule_history_ibfk_4` FOREIGN KEY (`rescheduled_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_reschedule_history`
--

LOCK TABLES `match_reschedule_history` WRITE;
/*!40000 ALTER TABLE `match_reschedule_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_reschedule_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_statistics`
--

DROP TABLE IF EXISTS `match_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `points_scored` int DEFAULT '0',
  `points_conceded` int DEFAULT '0',
  `aces` int DEFAULT '0',
  `double_faults` int DEFAULT '0',
  `first_serve_percentage` decimal(5,2) DEFAULT NULL,
  `break_points_won` int DEFAULT '0',
  `unforced_errors` int DEFAULT '0',
  `winners` int DEFAULT '0',
  `goals` int DEFAULT '0',
  `assists` int DEFAULT '0',
  `yellow_cards` int DEFAULT '0',
  `red_cards` int DEFAULT '0',
  `substitutions` int DEFAULT '0',
  `spikes` int DEFAULT '0',
  `blocks` int DEFAULT '0',
  `serves` int DEFAULT '0',
  `digs` int DEFAULT '0',
  `stats_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_match_participant_stats` (`match_id`,`participant_id`),
  KEY `idx_match_stats_match` (`match_id`),
  KEY `idx_match_stats_participant` (`participant_id`),
  CONSTRAINT `match_statistics_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_statistics_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_statistics`
--

LOCK TABLES `match_statistics` WRITE;
/*!40000 ALTER TABLE `match_statistics` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_timeline`
--

DROP TABLE IF EXISTS `match_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_timeline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `sequence_number` int NOT NULL,
  `event_time` datetime NOT NULL,
  `elapsed_seconds` int DEFAULT NULL COMMENT 'Seconds from match start',
  `event_category` enum('score','card','substitution','timeout','injury','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_description` text COLLATE utf8mb4_unicode_ci,
  `event_data` json DEFAULT NULL,
  `participant_id` int DEFAULT NULL COMMENT 'Who performed the action',
  `affected_participant_id` int DEFAULT NULL COMMENT 'Who was affected',
  `score_impact` tinyint(1) DEFAULT '0',
  `score_after` json DEFAULT NULL,
  `video_timestamp` int DEFAULT NULL COMMENT 'For video replay sync',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_match_sequence` (`match_id`,`sequence_number`),
  KEY `idx_match_timeline` (`match_id`,`sequence_number`),
  KEY `idx_timeline_time` (`match_id`,`event_time`),
  KEY `idx_timeline_category` (`match_id`,`event_category`),
  KEY `idx_timeline_event_type` (`match_id`,`event_type`),
  CONSTRAINT `match_timeline_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_timeline`
--

LOCK TABLES `match_timeline` WRITE;
/*!40000 ALTER TABLE `match_timeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_verifications`
--

DROP TABLE IF EXISTS `match_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `verified` tinyint(1) DEFAULT '0',
  `verification_time` timestamp NULL DEFAULT NULL,
  `dispute_raised` tinyint(1) DEFAULT '0',
  `dispute_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_match_verification` (`match_id`,`participant_id`),
  KEY `participant_id` (`participant_id`),
  KEY `idx_match_verifications_match` (`match_id`),
  CONSTRAINT `match_verifications_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_verifications_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_verifications`
--

LOCK TABLES `match_verifications` WRITE;
/*!40000 ALTER TABLE `match_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `round_number` int NOT NULL,
  `match_number` int NOT NULL,
  `round_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participant1_id` int DEFAULT NULL,
  `participant2_id` int DEFAULT NULL,
  `venue_id` int DEFAULT NULL,
  `court_id` int DEFAULT NULL,
  `match_date` date DEFAULT NULL,
  `match_time` time DEFAULT NULL,
  `estimated_duration` int DEFAULT '90',
  `best_of_sets` int DEFAULT '3',
  `sets_played` int DEFAULT '0',
  `referee_id` int DEFAULT NULL,
  `status` enum('pending','scheduled','ready','in_progress','completed','cancelled','postponed','walkover') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `winner_participant_id` int DEFAULT NULL,
  `score` json DEFAULT NULL,
  `depends_on_match1_id` int DEFAULT NULL,
  `depends_on_match2_id` int DEFAULT NULL,
  `depends_on_position` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `actual_start_time` datetime DEFAULT NULL,
  `actual_end_time` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `participant2_id` (`participant2_id`),
  KEY `venue_id` (`venue_id`),
  KEY `depends_on_match1_id` (`depends_on_match1_id`),
  KEY `depends_on_match2_id` (`depends_on_match2_id`),
  KEY `idx_matches_tournament` (`tournament_id`),
  KEY `idx_matches_group` (`group_id`),
  KEY `idx_matches_datetime` (`match_date`,`match_time`),
  KEY `idx_matches_court` (`court_id`),
  KEY `idx_matches_status` (`status`),
  KEY `idx_matches_referee` (`referee_id`),
  KEY `idx_matches_round` (`tournament_id`,`round_number`),
  KEY `idx_matches_participants` (`participant1_id`,`participant2_id`),
  KEY `idx_matches_winner` (`winner_participant_id`),
  KEY `idx_matches_tournament_status_date` (`tournament_id`,`status`,`match_date`),
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `matches_ibfk_10` FOREIGN KEY (`depends_on_match2_id`) REFERENCES `matches` (`id`),
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `tournament_groups` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`participant1_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`participant2_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `matches_ibfk_5` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`),
  CONSTRAINT `matches_ibfk_6` FOREIGN KEY (`court_id`) REFERENCES `courts` (`id`),
  CONSTRAINT `matches_ibfk_7` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`),
  CONSTRAINT `matches_ibfk_8` FOREIGN KEY (`winner_participant_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `matches_ibfk_9` FOREIGN KEY (`depends_on_match1_id`) REFERENCES `matches` (`id`),
  CONSTRAINT `check_match_participants` CHECK ((((`participant1_id` is null) and (`participant2_id` is null)) or ((`participant1_id` is not null) and (`participant2_id` is not null) and (`participant1_id` <> `participant2_id`))))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (1,2,NULL,1,1,'Round 1',3,2,NULL,NULL,'2025-11-03','15:14:00',90,3,0,NULL,'scheduled',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-27 08:55:46','2025-10-27 09:44:16'),(12,3,NULL,1,1,'Round 1',5,7,NULL,NULL,NULL,NULL,90,3,0,NULL,'pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-27 11:29:09','2025-10-27 12:39:27'),(13,3,NULL,1,2,'Round 1',4,6,NULL,NULL,NULL,NULL,90,3,0,NULL,'pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-27 11:29:09','2025-10-27 12:39:27'),(14,3,NULL,2,1,'Final',NULL,NULL,NULL,NULL,NULL,NULL,90,3,0,NULL,'pending',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-10-27 11:29:09','2025-10-27 12:39:27');
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_update_tournament_analytics_on_match` AFTER UPDATE ON `matches` FOR EACH ROW BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE tournament_analytics
        SET matches_completed = matches_completed + 1,
            match_completion_rate = (matches_completed + 1) * 100.0 / NULLIF(matches_scheduled, 0)
        WHERE tournament_id = NEW.tournament_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_update_referee_performance` AFTER UPDATE ON `matches` FOR EACH ROW BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.referee_id IS NOT NULL THEN
        INSERT IGNORE INTO referee_performance (referee_id, total_matches_assigned, matches_completed)
        VALUES (NEW.referee_id, 1, 1)
        ON DUPLICATE KEY UPDATE
            matches_completed = matches_completed + 1,
            reliability_score = (matches_completed + 1) * 100.0 / total_matches_assigned,
            last_match_date = NEW.match_date;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_email` tinyint(1) DEFAULT '1',
  `channel_push` tinyint(1) DEFAULT '1',
  `channel_sms` tinyint(1) DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_notification_type` (`user_id`,`notification_type`),
  KEY `idx_notif_prefs_user` (`user_id`),
  CONSTRAINT `notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_preferences`
--

LOCK TABLES `notification_preferences` WRITE;
/*!40000 ALTER TABLE `notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('match_reminder','tournament_update','payment','general','referee_assignment','invitation','dispute','result') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `related_id` int DEFAULT NULL,
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`,`is_read`),
  KEY `idx_notifications_created` (`created_at`),
  KEY `idx_notifications_type_read` (`type`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otp_verifications`
--

DROP TABLE IF EXISTS `otp_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otp_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_code` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `attempts` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_otp_phone` (`phone`),
  KEY `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otp_verifications`
--

LOCK TABLES `otp_verifications` WRITE;
/*!40000 ALTER TABLE `otp_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partnership_invitations`
--

DROP TABLE IF EXISTS `partnership_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partnership_invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `inviter_id` int NOT NULL,
  `invitee_id` int NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_partnership_invitation` (`tournament_id`,`inviter_id`,`invitee_id`),
  KEY `inviter_id` (`inviter_id`),
  KEY `idx_partnership_invitations_tournament` (`tournament_id`),
  KEY `idx_partnership_invitations_invitee` (`invitee_id`),
  CONSTRAINT `partnership_invitations_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partnership_invitations_ibfk_2` FOREIGN KEY (`inviter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partnership_invitations_ibfk_3` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partnership_invitations`
--

LOCK TABLES `partnership_invitations` WRITE;
/*!40000 ALTER TABLE `partnership_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `partnership_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partnerships`
--

DROP TABLE IF EXISTS `partnerships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partnerships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `player1_id` int NOT NULL,
  `player2_id` int NOT NULL,
  `partnership_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','confirmed','dissolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_by` int NOT NULL,
  `invitation_id` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_partnership` (`tournament_id`,`player1_id`,`player2_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_partnerships_tournament` (`tournament_id`),
  KEY `idx_partnerships_player1` (`player1_id`),
  KEY `idx_partnerships_player2` (`player2_id`),
  KEY `idx_partnerships_deleted` (`deleted_at`),
  KEY `fk_partnerships_invitation` (`invitation_id`),
  CONSTRAINT `fk_partnerships_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `partnership_invitations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `partnerships_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partnerships_ibfk_2` FOREIGN KEY (`player1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partnerships_ibfk_3` FOREIGN KEY (`player2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `partnerships_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `partnerships_chk_1` CHECK ((`player1_id` < `player2_id`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partnerships`
--

LOCK TABLES `partnerships` WRITE;
/*!40000 ALTER TABLE `partnerships` DISABLE KEYS */;
/*!40000 ALTER TABLE `partnerships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tournament_id` int NOT NULL,
  `participant_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci DEFAULT 'INR',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_gateway_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `refund_date` timestamp NULL DEFAULT NULL,
  `refund_reason` text COLLATE utf8mb4_unicode_ci,
  `refunded_amount` decimal(10,2) DEFAULT '0.00',
  `refunded_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `participant_id` (`participant_id`),
  KEY `refunded_by` (`refunded_by`),
  KEY `idx_payments_user` (`user_id`),
  KEY `idx_payments_tournament` (`tournament_id`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_tournament_status` (`tournament_id`,`status`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`),
  CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`),
  CONSTRAINT `payments_ibfk_4` FOREIGN KEY (`refunded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_update_wallet_on_payment` AFTER UPDATE ON `payments` FOR EACH ROW BEGIN
    DECLARE v_organizer_id INT;
    DECLARE v_commission_percent DECIMAL(5,2);
    DECLARE v_organizer_amount DECIMAL(10,2);
    
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        
        SELECT organizer_id, platform_commission_percent 
        INTO v_organizer_id, v_commission_percent
        FROM tournaments WHERE id = NEW.tournament_id;
        
        
        SET v_organizer_amount = NEW.amount * (100 - v_commission_percent) / 100;
        
        
        INSERT IGNORE INTO tournament_creator_wallets (user_id, balance, total_earned)
        VALUES (v_organizer_id, v_organizer_amount, v_organizer_amount)
        ON DUPLICATE KEY UPDATE
            balance = balance + v_organizer_amount,
            total_earned = total_earned + v_organizer_amount;
            
        
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `player_availability`
--

DROP TABLE IF EXISTS `player_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `player_id` int NOT NULL,
  `tournament_id` int NOT NULL,
  `unavailable_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `all_day` tinyint(1) DEFAULT '0',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_player_unavailable_slot` (`player_id`,`tournament_id`,`unavailable_date`,`start_time`),
  KEY `tournament_id` (`tournament_id`),
  KEY `idx_player_availability_player` (`player_id`),
  KEY `idx_player_availability_date` (`unavailable_date`),
  CONSTRAINT `player_availability_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_availability_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_availability`
--

LOCK TABLES `player_availability` WRITE;
/*!40000 ALTER TABLE `player_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_role_conflicts`
--

DROP TABLE IF EXISTS `player_role_conflicts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_role_conflicts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `player_id` int NOT NULL,
  `match_id` int NOT NULL,
  `conflict_type` enum('playing_and_refereeing','double_booking','rest_time_violation','own_match_referee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detected_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved` tinyint(1) DEFAULT '0',
  `resolution_action` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_conflicts_player` (`player_id`),
  KEY `idx_conflicts_match` (`match_id`),
  KEY `idx_conflicts_resolved` (`resolved`),
  CONSTRAINT `player_role_conflicts_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_role_conflicts_ibfk_2` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_role_conflicts`
--

LOCK TABLES `player_role_conflicts` WRITE;
/*!40000 ALTER TABLE `player_role_conflicts` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_role_conflicts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_schedule`
--

DROP TABLE IF EXISTS `player_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `player_id` int NOT NULL,
  `match_id` int NOT NULL,
  `role` enum('participant','referee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduled_date` date NOT NULL,
  `scheduled_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('confirmed','pending','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_player_match` (`player_id`,`match_id`),
  UNIQUE KEY `unique_player_time_slot` (`player_id`,`scheduled_date`,`scheduled_time`),
  KEY `idx_player_schedule_player` (`player_id`),
  KEY `idx_player_schedule_datetime` (`scheduled_date`,`scheduled_time`),
  KEY `idx_player_schedule_datetime_status` (`scheduled_date`,`scheduled_time`,`status`),
  KEY `idx_player_schedule_match` (`match_id`),
  KEY `idx_player_schedule_date_role` (`scheduled_date`,`role`,`status`),
  CONSTRAINT `player_schedule_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_schedule_ibfk_2` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_schedule`
--

LOCK TABLES `player_schedule` WRITE;
/*!40000 ALTER TABLE `player_schedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_sport_performance`
--

DROP TABLE IF EXISTS `player_sport_performance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_sport_performance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `total_matches` int DEFAULT '0',
  `total_wins` int DEFAULT '0',
  `total_losses` int DEFAULT '0',
  `total_points_scored` int DEFAULT '0',
  `total_points_conceded` int DEFAULT '0',
  `sport_specific_stats` json DEFAULT NULL,
  `average_score_per_match` decimal(10,2) DEFAULT NULL,
  `win_percentage` decimal(5,2) DEFAULT NULL,
  `performance_rating` decimal(5,2) DEFAULT NULL COMMENT 'Calculated rating',
  `season` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_match_date` date DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_player_sport_tournament` (`user_id`,`sport_id`,`tournament_id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `idx_player_sport` (`user_id`,`sport_id`),
  KEY `idx_performance_rating` (`performance_rating` DESC),
  KEY `idx_sport_performance` (`sport_id`,`performance_rating` DESC),
  KEY `idx_performance_sport_rating` (`sport_id`,`performance_rating` DESC),
  CONSTRAINT `player_sport_performance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_sport_performance_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`),
  CONSTRAINT `player_sport_performance_ibfk_3` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_sport_performance`
--

LOCK TABLES `player_sport_performance` WRITE;
/*!40000 ALTER TABLE `player_sport_performance` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_sport_performance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_statistics`
--

DROP TABLE IF EXISTS `player_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `total_matches` int DEFAULT '0',
  `total_wins` int DEFAULT '0',
  `total_losses` int DEFAULT '0',
  `win_percentage` decimal(5,2) DEFAULT '0.00',
  `detailed_stats` json DEFAULT NULL,
  `current_ranking` int DEFAULT NULL,
  `highest_ranking` int DEFAULT NULL,
  `ranking_points` int DEFAULT '0',
  `last_match_date` date DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_player_sport_stats` (`user_id`,`sport_id`),
  KEY `idx_player_stats_user` (`user_id`),
  KEY `idx_player_stats_sport` (`sport_id`),
  KEY `idx_player_stats_ranking` (`current_ranking`),
  CONSTRAINT `player_statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `player_statistics_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_statistics`
--

LOCK TABLES `player_statistics` WRITE;
/*!40000 ALTER TABLE `player_statistics` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prize_distribution`
--

DROP TABLE IF EXISTS `prize_distribution`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prize_distribution` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `position` int NOT NULL,
  `position_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prize_amount` decimal(10,2) NOT NULL,
  `participant_id` int DEFAULT NULL,
  `payment_status` enum('pending','processing','paid') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `participant_id` (`participant_id`),
  KEY `idx_prize_tournament` (`tournament_id`),
  KEY `idx_prize_status` (`payment_status`),
  CONSTRAINT `prize_distribution_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prize_distribution_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prize_distribution`
--

LOCK TABLES `prize_distribution` WRITE;
/*!40000 ALTER TABLE `prize_distribution` DISABLE KEYS */;
/*!40000 ALTER TABLE `prize_distribution` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referee_assignment_requests`
--

DROP TABLE IF EXISTS `referee_assignment_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referee_assignment_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `referee_id` int NOT NULL,
  `assigned_by` int NOT NULL,
  `status` enum('pending','accepted','declined','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` timestamp NULL DEFAULT NULL,
  `decline_reason` text COLLATE utf8mb4_unicode_ci,
  `notification_sent` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_match_referee_assignment` (`match_id`,`referee_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_referee_requests_match` (`match_id`),
  KEY `idx_referee_requests_referee` (`referee_id`),
  KEY `idx_referee_requests_status` (`status`),
  CONSTRAINT `referee_assignment_requests_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referee_assignment_requests_ibfk_2` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referee_assignment_requests_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referee_assignment_requests`
--

LOCK TABLES `referee_assignment_requests` WRITE;
/*!40000 ALTER TABLE `referee_assignment_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `referee_assignment_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referee_availability`
--

DROP TABLE IF EXISTS `referee_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referee_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referee_id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `available_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_referee_slot` (`referee_id`,`available_date`,`start_time`),
  KEY `tournament_id` (`tournament_id`),
  KEY `idx_referee_availability_referee` (`referee_id`),
  KEY `idx_referee_availability_date` (`available_date`),
  CONSTRAINT `referee_availability_ibfk_1` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referee_availability_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referee_availability`
--

LOCK TABLES `referee_availability` WRITE;
/*!40000 ALTER TABLE `referee_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `referee_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referee_certifications`
--

DROP TABLE IF EXISTS `referee_certifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referee_certifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referee_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `certification_level` enum('beginner','intermediate','advanced','professional') COLLATE utf8mb4_unicode_ci NOT NULL,
  `certified_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `certification_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issuing_authority` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_referee_sport_cert` (`referee_id`,`sport_id`),
  KEY `idx_certifications_sport` (`sport_id`),
  KEY `idx_certifications_active` (`is_active`),
  CONSTRAINT `referee_certifications_ibfk_1` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `referee_certifications_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referee_certifications`
--

LOCK TABLES `referee_certifications` WRITE;
/*!40000 ALTER TABLE `referee_certifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `referee_certifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `referee_performance`
--

DROP TABLE IF EXISTS `referee_performance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `referee_performance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `referee_id` int NOT NULL,
  `total_matches_assigned` int DEFAULT '0',
  `matches_completed` int DEFAULT '0',
  `matches_missed` int DEFAULT '0',
  `reliability_score` decimal(5,2) DEFAULT '100.00',
  `average_rating` decimal(3,2) DEFAULT '0.00',
  `last_match_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_referee` (`referee_id`),
  KEY `idx_referee_performance_score` (`reliability_score`),
  CONSTRAINT `referee_performance_ibfk_1` FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `referee_performance`
--

LOCK TABLES `referee_performance` WRITE;
/*!40000 ALTER TABLE `referee_performance` DISABLE KEYS */;
/*!40000 ALTER TABLE `referee_performance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_policies`
--

DROP TABLE IF EXISTS `refund_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_policies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `cancellation_window_hours` int NOT NULL,
  `refund_percentage` decimal(5,2) NOT NULL,
  `policy_description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_refund_policies_tournament` (`tournament_id`),
  CONSTRAINT `refund_policies_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_policies`
--

LOCK TABLES `refund_policies` WRITE;
/*!40000 ALTER TABLE `refund_policies` DISABLE KEYS */;
/*!40000 ALTER TABLE `refund_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_requests`
--

DROP TABLE IF EXISTS `refund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `participant_id` int NOT NULL,
  `tournament_id` int NOT NULL,
  `requested_amount` decimal(10,2) NOT NULL,
  `refund_percentage` decimal(5,2) NOT NULL,
  `reason` enum('tournament_cancelled','player_withdrawal','duplicate_payment','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_details` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved','rejected','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  `processed_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `participant_id` (`participant_id`),
  KEY `processed_by` (`processed_by`),
  KEY `idx_refund_requests_payment` (`payment_id`),
  KEY `idx_refund_requests_tournament` (`tournament_id`),
  KEY `idx_refund_requests_status` (`status`),
  CONSTRAINT `refund_requests_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `refund_requests_ibfk_2` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refund_requests_ibfk_3` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`),
  CONSTRAINT `refund_requests_ibfk_4` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_requests`
--

LOCK TABLES `refund_requests` WRITE;
/*!40000 ALTER TABLE `refund_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `refund_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedule_constraints`
--

DROP TABLE IF EXISTS `schedule_constraints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_constraints` (
  `tournament_id` int NOT NULL,
  `min_rest_hours` int NOT NULL DEFAULT '2',
  `max_matches_per_day` int NOT NULL DEFAULT '3',
  `buffer_minutes` int NOT NULL DEFAULT '15',
  `daily_start_time` time NOT NULL DEFAULT '09:00:00',
  `daily_end_time` time NOT NULL DEFAULT '20:00:00',
  `match_duration_minutes` int NOT NULL DEFAULT '60',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tournament_id`),
  CONSTRAINT `schedule_constraints_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `check_max_matches` CHECK ((`max_matches_per_day` >= 1)),
  CONSTRAINT `check_rest_hours` CHECK ((`min_rest_hours` >= 0)),
  CONSTRAINT `check_schedule_times` CHECK ((`daily_end_time` > `daily_start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedule_constraints`
--

LOCK TABLES `schedule_constraints` WRITE;
/*!40000 ALTER TABLE `schedule_constraints` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedule_constraints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scheduling_conflicts`
--

DROP TABLE IF EXISTS `scheduling_conflicts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_conflicts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `match_id` int DEFAULT NULL,
  `conflict_type` enum('player_busy','court_occupied','no_referee','rest_time_violation','referee_unavailable') COLLATE utf8mb4_unicode_ci NOT NULL,
  `conflict_details` text COLLATE utf8mb4_unicode_ci,
  `involved_player_id` int DEFAULT NULL,
  `involved_court_id` int DEFAULT NULL,
  `attempted_time` datetime NOT NULL,
  `resolution_status` enum('pending','resolved','ignored') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `resolution_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `involved_player_id` (`involved_player_id`),
  KEY `involved_court_id` (`involved_court_id`),
  KEY `idx_conflicts_tournament` (`tournament_id`),
  KEY `idx_conflicts_match` (`match_id`),
  KEY `idx_conflicts_status` (`resolution_status`),
  CONSTRAINT `scheduling_conflicts_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scheduling_conflicts_ibfk_2` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scheduling_conflicts_ibfk_3` FOREIGN KEY (`involved_player_id`) REFERENCES `users` (`id`),
  CONSTRAINT `scheduling_conflicts_ibfk_4` FOREIGN KEY (`involved_court_id`) REFERENCES `courts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scheduling_conflicts`
--

LOCK TABLES `scheduling_conflicts` WRITE;
/*!40000 ALTER TABLE `scheduling_conflicts` DISABLE KEYS */;
/*!40000 ALTER TABLE `scheduling_conflicts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schema_migrations`
--

DROP TABLE IF EXISTS `schema_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schema_migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `executed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schema_migrations`
--

LOCK TABLES `schema_migrations` WRITE;
/*!40000 ALTER TABLE `schema_migrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `schema_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scoring_events`
--

DROP TABLE IF EXISTS `scoring_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scoring_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `match_id` int NOT NULL,
  `sport_id` int DEFAULT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_data` json DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `scorer_id` int NOT NULL,
  `period_number` int DEFAULT '1' COMMENT 'Set/Game/Half number',
  `period_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'regular' COMMENT 'regular, extra_time, tiebreak, penalty',
  `score_before` json DEFAULT NULL COMMENT 'Score before this event',
  `score_after` json DEFAULT NULL COMMENT 'Score after this event',
  `player_id` int DEFAULT NULL COMMENT 'Individual player who scored/acted',
  `team_id` int DEFAULT NULL COMMENT 'Team (for team sports)',
  `point_value` int DEFAULT '1' COMMENT 'Points awarded',
  `is_critical` tinyint(1) DEFAULT '0' COMMENT 'Match point, set point, etc.',
  PRIMARY KEY (`id`),
  KEY `scorer_id` (`scorer_id`),
  KEY `team_id` (`team_id`),
  KEY `idx_scoring_match` (`match_id`),
  KEY `idx_scoring_timestamp` (`timestamp`),
  KEY `idx_scoring_sport` (`sport_id`),
  KEY `idx_scoring_player` (`player_id`),
  KEY `idx_scoring_period` (`match_id`,`period_number`),
  CONSTRAINT `scoring_events_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scoring_events_ibfk_2` FOREIGN KEY (`scorer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `scoring_events_ibfk_3` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`),
  CONSTRAINT `scoring_events_ibfk_4` FOREIGN KEY (`player_id`) REFERENCES `users` (`id`),
  CONSTRAINT `scoring_events_ibfk_5` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scoring_events`
--

LOCK TABLES `scoring_events` WRITE;
/*!40000 ALTER TABLE `scoring_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `scoring_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sport_scoring_config`
--

DROP TABLE IF EXISTS `sport_scoring_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_scoring_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sport_id` int NOT NULL,
  `config_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` json NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_sport_config` (`sport_id`,`config_name`),
  KEY `idx_sport_config` (`sport_id`),
  CONSTRAINT `sport_scoring_config_ibfk_1` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_scoring_config`
--

LOCK TABLES `sport_scoring_config` WRITE;
/*!40000 ALTER TABLE `sport_scoring_config` DISABLE KEYS */;
INSERT INTO `sport_scoring_config` VALUES (1,1,'point_progression','[\"0\", \"15\", \"30\", \"40\", \"game\"]','Tennis point system',1,'2025-10-24 07:37:23'),(2,1,'deuce_rule','{\"enabled\": true, \"advantage\": true}','Deuce and advantage rule',1,'2025-10-24 07:37:23'),(3,1,'tiebreak_rule','{\"win_by\": 2, \"at_score\": \"6-6\", \"points_to_win\": 7}','Tiebreak rules',1,'2025-10-24 07:37:23'),(4,1,'sets_to_win','{\"best_of\": 3, \"sets_required\": 2}','Match format',1,'2025-10-24 07:37:23'),(5,2,'rally_point','{\"enabled\": true, \"every_rally_scores\": true}','Rally point system',1,'2025-10-24 07:37:23'),(6,2,'game_points','{\"win_by\": 2, \"max_points\": 30, \"points_to_win\": 21}','Game scoring',1,'2025-10-24 07:37:23'),(7,2,'games_to_win','{\"best_of\": 3, \"games_required\": 2}','Match format',1,'2025-10-24 07:37:23'),(8,3,'rally_point','{\"enabled\": true}','Rally point system',1,'2025-10-24 07:37:23'),(9,3,'game_points','{\"win_by\": 2, \"points_to_win\": 11}','Game scoring',1,'2025-10-24 07:37:23'),(10,3,'service_rotation','{\"deuce_rotation\": 1, \"points_per_rotation\": 2}','Service rules',1,'2025-10-24 07:37:23'),(11,4,'serving_team_scores','{\"enabled\": true}','Only serving team scores',1,'2025-10-24 07:37:23'),(12,4,'game_points','{\"win_by\": 2, \"points_to_win\": 11}','Game scoring',1,'2025-10-24 07:37:23'),(13,4,'doubles_serves','{\"two_serves_per_side\": true, \"first_service_exception\": true}','Doubles serving',1,'2025-10-24 07:37:23'),(14,5,'point_progression','[\"0\", \"15\", \"30\", \"40\", \"game\"]','Padel point system',1,'2025-10-24 07:37:23'),(15,5,'doubles_only','{\"required\": true}','Always played in doubles',1,'2025-10-24 07:37:23'),(16,5,'tiebreak_rule','{\"win_by\": 2, \"at_score\": \"6-6\", \"points_to_win\": 7}','Tiebreak rules',1,'2025-10-24 07:37:23'),(17,6,'rally_point','{\"enabled\": true}','Rally point system',1,'2025-10-24 07:37:23'),(18,6,'game_points','{\"win_by\": 2, \"points_to_win\": 11}','Game scoring',1,'2025-10-24 07:37:23'),(19,6,'games_to_win','{\"best_of\": 5, \"games_required\": 3}','Match format',1,'2025-10-24 07:37:23'),(20,7,'rally_point','{\"enabled\": true}','Rally point system',1,'2025-10-24 07:37:23'),(21,7,'set_points','{\"win_by\": 2, \"points_to_win\": 25, \"deciding_set_points\": 15}','Set scoring',1,'2025-10-24 07:37:23'),(22,7,'rotation_system','{\"enabled\": true, \"clockwise\": true}','Player rotation',1,'2025-10-24 07:37:23'),(23,8,'match_duration','{\"periods\": 2, \"period_minutes\": 45, \"half_time_minutes\": 15}','Match timing',1,'2025-10-24 07:37:23'),(24,8,'extra_time','{\"periods\": 2, \"period_minutes\": 15}','Extra time rules',1,'2025-10-24 07:37:23'),(25,8,'penalty_shootout','{\"enabled\": true, \"sudden_death\": true, \"initial_kicks\": 5}','Penalty rules',1,'2025-10-24 07:37:23'),(26,8,'substitutions','{\"max_allowed\": 5, \"extra_time_additional\": 1}','Substitution rules',1,'2025-10-24 07:37:23');
/*!40000 ALTER TABLE `sport_scoring_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sports`
--

DROP TABLE IF EXISTS `sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('racquet','team') COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_players_per_side` int NOT NULL,
  `max_players_per_side` int NOT NULL,
  `scoring_system` json DEFAULT NULL,
  `default_match_duration` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_sports_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sports`
--

LOCK TABLES `sports` WRITE;
/*!40000 ALTER TABLE `sports` DISABLE KEYS */;
INSERT INTO `sports` VALUES (1,'Tennis','racquet',1,2,'{\"sets\": 3, \"points\": [\"0\", \"15\", \"30\", \"40\", \"game\"], \"games_per_set\": 6}',120,'2025-10-24 07:37:22'),(2,'Badminton','racquet',1,2,'{\"sets\": 3, \"points_per_set\": 21, \"winning_margin\": 2}',60,'2025-10-24 07:37:22'),(3,'Table Tennis','racquet',1,2,'{\"sets\": 5, \"points_per_set\": 11, \"winning_margin\": 2}',45,'2025-10-24 07:37:22'),(4,'Pickleball','racquet',1,2,'{\"sets\": 3, \"points_per_set\": 11, \"winning_margin\": 2}',30,'2025-10-24 07:37:22'),(5,'Padel','racquet',2,2,'{\"sets\": 3, \"points\": [\"0\", \"15\", \"30\", \"40\", \"game\"], \"games_per_set\": 6}',90,'2025-10-24 07:37:22'),(6,'Squash','racquet',1,1,'{\"sets\": 5, \"points_per_set\": 11, \"winning_margin\": 2}',45,'2025-10-24 07:37:22'),(7,'Volleyball','team',6,6,'{\"sets\": 5, \"points_per_set\": 25, \"winning_margin\": 2, \"deciding_set_points\": 15}',90,'2025-10-24 07:37:22'),(8,'Football','team',11,11,'{\"periods\": 2, \"extra_time\": 30, \"period_duration\": 45}',90,'2025-10-24 07:37:22');
/*!40000 ALTER TABLE `sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_invitations`
--

DROP TABLE IF EXISTS `team_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_invitations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `invited_user_id` int NOT NULL,
  `invited_by` int NOT NULL,
  `status` enum('pending','accepted','rejected','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `invited_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_invitation` (`team_id`,`invited_user_id`),
  KEY `invited_by` (`invited_by`),
  KEY `idx_team_invitations_team` (`team_id`),
  KEY `idx_team_invitations_user` (`invited_user_id`),
  KEY `idx_team_invitations_status` (`status`),
  CONSTRAINT `team_invitations_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_invitations_ibfk_2` FOREIGN KEY (`invited_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_invitations_ibfk_3` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_invitations`
--

LOCK TABLES `team_invitations` WRITE;
/*!40000 ALTER TABLE `team_invitations` DISABLE KEYS */;
INSERT INTO `team_invitations` VALUES (1,1,3,1,'accepted','2025-10-24 08:55:43','2025-10-24 09:00:45'),(2,1,4,1,'accepted','2025-10-24 08:55:50','2025-10-24 09:01:06'),(3,1,5,1,'accepted','2025-10-24 08:56:00','2025-10-24 09:01:27'),(4,1,6,1,'accepted','2025-10-24 08:56:06','2025-10-24 09:01:41'),(5,1,7,1,'accepted','2025-10-24 08:56:13','2025-10-24 09:02:10'),(6,1,8,1,'accepted','2025-10-24 08:56:21','2025-10-24 09:02:24'),(7,1,9,1,'accepted','2025-10-24 08:56:29','2025-10-24 09:02:43'),(8,1,11,1,'accepted','2025-10-24 08:55:43','2025-10-24 09:00:45'),(9,1,10,1,'accepted','2025-10-24 09:04:18','2025-10-24 09:05:09'),(10,1,12,1,'accepted','2025-10-24 09:04:26','2025-10-24 09:15:00');
/*!40000 ALTER TABLE `team_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `user_id` int NOT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jersey_number` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_member` (`team_id`,`user_id`),
  KEY `idx_team_members_team` (`team_id`),
  KEY `idx_team_members_user` (`user_id`),
  KEY `idx_team_members_active` (`is_active`),
  CONSTRAINT `team_members_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,1,1,NULL,NULL,1,'2025-10-24 08:17:51'),(2,1,11,NULL,NULL,1,'2025-10-24 08:17:51'),(3,1,3,NULL,NULL,1,'2025-10-24 09:00:45'),(4,1,4,NULL,NULL,1,'2025-10-24 09:01:06'),(5,1,5,NULL,NULL,1,'2025-10-24 09:01:27'),(6,1,6,NULL,NULL,1,'2025-10-24 09:01:41'),(7,1,7,NULL,NULL,1,'2025-10-24 09:02:10'),(8,1,8,NULL,NULL,1,'2025-10-24 09:02:24'),(9,1,9,NULL,NULL,1,'2025-10-24 09:02:43'),(10,1,10,NULL,NULL,1,'2025-10-24 09:05:09'),(11,1,12,NULL,NULL,1,'2025-10-24 09:15:00'),(12,2,1,NULL,NULL,1,'2025-10-24 09:55:09');
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_tournament_registrations`
--

DROP TABLE IF EXISTS `team_tournament_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_tournament_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `tournament_id` int NOT NULL,
  `registration_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','confirmed','rejected','withdrawn') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','paid','refunded','waived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_tournament_registration` (`team_id`,`tournament_id`),
  KEY `idx_team_tournament_reg_team` (`team_id`),
  KEY `idx_team_tournament_reg_tournament` (`tournament_id`),
  KEY `idx_team_tournament_reg_status` (`status`),
  CONSTRAINT `team_tournament_registrations_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `team_tournament_registrations_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_tournament_registrations`
--

LOCK TABLES `team_tournament_registrations` WRITE;
/*!40000 ALTER TABLE `team_tournament_registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_tournament_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tournament_id` int DEFAULT NULL COMMENT 'Required if is_tournament_specific=TRUE. NULL if is_tournament_specific=FALSE',
  `creator_id` int NOT NULL,
  `captain_id` int NOT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `max_players` int DEFAULT '11',
  `is_tournament_specific` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'TRUE: Team is specific to one tournament. FALSE: Team can participate in multiple tournaments',
  `sport_id` int DEFAULT NULL COMMENT 'Required if is_tournament_specific=FALSE. Defines sport type for reusable teams',
  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'If true, team is visible to all users for joining',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_team_name_creator_tournament` (`name`,`creator_id`,`tournament_id`),
  KEY `idx_teams_tournament` (`tournament_id`),
  KEY `idx_teams_creator` (`creator_id`),
  KEY `idx_teams_captain` (`captain_id`),
  KEY `idx_teams_deleted` (`deleted_at`),
  KEY `idx_teams_sport` (`sport_id`),
  KEY `idx_teams_tournament_specific` (`is_tournament_specific`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`),
  CONSTRAINT `teams_ibfk_3` FOREIGN KEY (`captain_id`) REFERENCES `users` (`id`),
  CONSTRAINT `teams_ibfk_4` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (1,'Blue Tigers',NULL,1,1,'https://fastly.picsum.photos/id/50/4608/3072.jpg?hmac=E6WgCk6MBOyuRjW4bypT6y-tFXyWQfC_LjIBYPUspxE','dev',11,0,8,1,NULL,'2025-10-24 08:17:51','2025-10-24 08:17:51'),(2,'Red Rockers',1,1,1,'http://dev.com','dev',11,1,NULL,0,NULL,'2025-10-24 09:55:09','2025-10-24 09:55:09');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tiebreaker_matches`
--

DROP TABLE IF EXISTS `tiebreaker_matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiebreaker_matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `original_position` int NOT NULL,
  `tied_participants` json NOT NULL,
  `tiebreaker_criteria` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','scheduled','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `idx_tiebreaker_tournament` (`tournament_id`),
  KEY `idx_tiebreaker_status` (`status`),
  CONSTRAINT `tiebreaker_matches_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tiebreaker_matches_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `tournament_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tiebreaker_matches`
--

LOCK TABLES `tiebreaker_matches` WRITE;
/*!40000 ALTER TABLE `tiebreaker_matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `tiebreaker_matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_analytics`
--

DROP TABLE IF EXISTS `tournament_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_analytics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `matches_scheduled` int DEFAULT '0',
  `matches_completed` int DEFAULT '0',
  `match_completion_rate` decimal(5,2) DEFAULT '0.00',
  `court_utilization_percentage` decimal(5,2) DEFAULT '0.00',
  `average_match_duration` int DEFAULT '0',
  `total_playing_time_minutes` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tournament_id` (`tournament_id`),
  KEY `idx_analytics_tournament` (`tournament_id`),
  CONSTRAINT `tournament_analytics_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_analytics`
--

LOCK TABLES `tournament_analytics` WRITE;
/*!40000 ALTER TABLE `tournament_analytics` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_analytics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_brackets`
--

DROP TABLE IF EXISTS `tournament_brackets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_brackets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `bracket_type` enum('main','consolation','qualifying') COLLATE utf8mb4_unicode_ci DEFAULT 'main',
  `round_number` int NOT NULL,
  `position_number` int NOT NULL,
  `participant_id` int DEFAULT NULL,
  `seed_number` int DEFAULT NULL,
  `advanced_from_match_id` int DEFAULT NULL,
  `status` enum('waiting','active','eliminated') COLLATE utf8mb4_unicode_ci DEFAULT 'waiting',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_bracket_position` (`tournament_id`,`bracket_type`,`round_number`,`position_number`),
  KEY `idx_brackets_tournament` (`tournament_id`),
  KEY `idx_brackets_round` (`tournament_id`,`round_number`),
  KEY `fk_tournament_brackets_participant` (`participant_id`),
  KEY `fk_tournament_brackets_match` (`advanced_from_match_id`),
  CONSTRAINT `fk_tournament_brackets_match` FOREIGN KEY (`advanced_from_match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tournament_brackets_participant` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_brackets_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_brackets`
--

LOCK TABLES `tournament_brackets` WRITE;
/*!40000 ALTER TABLE `tournament_brackets` DISABLE KEYS */;
INSERT INTO `tournament_brackets` VALUES (1,2,'main',1,1,3,1,NULL,'active','2025-10-27 08:55:46'),(2,2,'main',1,2,2,2,NULL,'active','2025-10-27 08:55:46'),(23,3,'main',1,1,5,1,NULL,'active','2025-10-27 11:29:09'),(24,3,'main',1,2,7,4,NULL,'active','2025-10-27 11:29:09'),(25,3,'main',1,3,4,2,NULL,'active','2025-10-27 11:29:09'),(26,3,'main',1,4,6,3,NULL,'active','2025-10-27 11:29:09');
/*!40000 ALTER TABLE `tournament_brackets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_creator_eligibility`
--

DROP TABLE IF EXISTS `tournament_creator_eligibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_creator_eligibility` (
  `user_id` int NOT NULL,
  `minimum_account_age_days` int DEFAULT '30',
  `requires_verified_payment` tinyint(1) DEFAULT '1',
  `requires_complete_profile` tinyint(1) DEFAULT '1',
  `is_eligible` tinyint(1) DEFAULT '0',
  `last_checked` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ineligibility_reasons` json DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `tournament_creator_eligibility_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_creator_eligibility`
--

LOCK TABLES `tournament_creator_eligibility` WRITE;
/*!40000 ALTER TABLE `tournament_creator_eligibility` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_creator_eligibility` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_creator_wallets`
--

DROP TABLE IF EXISTS `tournament_creator_wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_creator_wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_earned` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_withdrawn` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bank_account_verified` tinyint(1) DEFAULT '0',
  `bank_details` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `idx_wallet_user` (`user_id`),
  CONSTRAINT `tournament_creator_wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_creator_wallets`
--

LOCK TABLES `tournament_creator_wallets` WRITE;
/*!40000 ALTER TABLE `tournament_creator_wallets` DISABLE KEYS */;
INSERT INTO `tournament_creator_wallets` VALUES (1,2,0.00,0.00,0.00,0,NULL,'2025-10-24 08:07:35','2025-10-24 08:07:35'),(2,1,0.00,0.00,0.00,0,NULL,'2025-10-27 10:33:22','2025-10-27 10:33:22');
/*!40000 ALTER TABLE `tournament_creator_wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_groups`
--

DROP TABLE IF EXISTS `tournament_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `group_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_group` (`tournament_id`,`group_name`),
  KEY `idx_groups_tournament` (`tournament_id`),
  CONSTRAINT `tournament_groups_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_groups`
--

LOCK TABLES `tournament_groups` WRITE;
/*!40000 ALTER TABLE `tournament_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_participants`
--

DROP TABLE IF EXISTS `tournament_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `partnership_id` int DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `registration_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_status` enum('pending','paid','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seed_number` int DEFAULT NULL,
  `status` enum('registered','confirmed','withdrawn','disqualified') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_participant` (`tournament_id`,`user_id`,`partnership_id`,`team_id`),
  KEY `idx_participants_tournament` (`tournament_id`),
  KEY `idx_participants_user` (`user_id`),
  KEY `idx_participants_partnership` (`partnership_id`),
  KEY `idx_participants_team` (`team_id`),
  KEY `idx_participants_status` (`status`),
  KEY `idx_participants_tournament_payment` (`tournament_id`,`payment_status`),
  CONSTRAINT `tournament_participants_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_3` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_ibfk_4` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_participants_chk_1` CHECK ((((`user_id` is not null) and (`partnership_id` is null) and (`team_id` is null)) or ((`user_id` is null) and (`partnership_id` is not null) and (`team_id` is null)) or ((`user_id` is null) and (`partnership_id` is null) and (`team_id` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_participants`
--

LOCK TABLES `tournament_participants` WRITE;
/*!40000 ALTER TABLE `tournament_participants` DISABLE KEYS */;
INSERT INTO `tournament_participants` VALUES (1,1,NULL,NULL,1,'2025-10-24 10:31:09','paid',NULL,NULL,'confirmed'),(2,2,4,NULL,NULL,'2025-10-24 11:54:00','paid',NULL,2,'confirmed'),(3,2,5,NULL,NULL,'2025-10-24 11:54:20','paid',NULL,1,'confirmed'),(4,3,11,NULL,NULL,'2025-10-27 10:54:18','paid',NULL,2,'confirmed'),(5,3,3,NULL,NULL,'2025-10-27 10:54:33','paid',NULL,1,'confirmed'),(6,3,4,NULL,NULL,'2025-10-27 10:54:49','paid',NULL,3,'confirmed'),(7,3,5,NULL,NULL,'2025-10-27 10:55:09','paid',NULL,4,'confirmed');
/*!40000 ALTER TABLE `tournament_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_standings`
--

DROP TABLE IF EXISTS `tournament_standings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_standings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `participant_id` int NOT NULL,
  `matches_played` int NOT NULL DEFAULT '0',
  `matches_won` int NOT NULL DEFAULT '0',
  `matches_lost` int NOT NULL DEFAULT '0',
  `matches_drawn` int NOT NULL DEFAULT '0',
  `points` int NOT NULL DEFAULT '0',
  `sets_won` int DEFAULT '0',
  `sets_lost` int DEFAULT '0',
  `games_won` int DEFAULT '0',
  `games_lost` int DEFAULT '0',
  `goal_difference` int DEFAULT '0',
  `form` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` int DEFAULT NULL,
  `is_eliminated` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_tournament_standing` (`tournament_id`,`participant_id`),
  KEY `participant_id` (`participant_id`),
  KEY `idx_standings_tournament` (`tournament_id`),
  KEY `idx_standings_group` (`group_id`),
  KEY `idx_standings_position` (`tournament_id`,`position`),
  CONSTRAINT `tournament_standings_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_standings_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `tournament_groups` (`id`),
  CONSTRAINT `tournament_standings_ibfk_3` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_standings`
--

LOCK TABLES `tournament_standings` WRITE;
/*!40000 ALTER TABLE `tournament_standings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_standings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_templates`
--

DROP TABLE IF EXISTS `tournament_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_by` int NOT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport_id` int NOT NULL,
  `format_type` enum('knockout','round_robin','groups_knockout','league','ladder') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('singles','doubles','teams') COLLATE utf8mb4_unicode_ci NOT NULL,
  `rules` json DEFAULT NULL,
  `default_entry_fee` decimal(10,2) DEFAULT NULL,
  `default_duration_days` int DEFAULT NULL,
  `default_max_participants` int DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '0',
  `times_used` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_templates_creator` (`created_by`),
  KEY `idx_templates_sport` (`sport_id`),
  CONSTRAINT `tournament_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_templates_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_templates`
--

LOCK TABLES `tournament_templates` WRITE;
/*!40000 ALTER TABLE `tournament_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_violations`
--

DROP TABLE IF EXISTS `tournament_violations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_violations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tournament_id` int NOT NULL,
  `violation_type` enum('account_age','incomplete_profile','payment_method','conduct','fraud','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_by` int DEFAULT NULL,
  `reported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `action_taken` enum('warning','suspension','cancellation','none') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `resolved` tinyint(1) DEFAULT '0',
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reported_by` (`reported_by`),
  KEY `idx_violations_tournament` (`tournament_id`),
  KEY `idx_violations_severity` (`severity`),
  KEY `idx_violations_resolved` (`resolved`),
  CONSTRAINT `tournament_violations_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tournament_violations_ibfk_2` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_violations`
--

LOCK TABLES `tournament_violations` WRITE;
/*!40000 ALTER TABLE `tournament_violations` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_violations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sport_id` int NOT NULL,
  `venue_id` int DEFAULT NULL,
  `organizer_id` int NOT NULL,
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `registration_start` datetime NOT NULL,
  `registration_end` datetime NOT NULL,
  `max_participants` int DEFAULT NULL,
  `entry_fee` decimal(10,2) DEFAULT '0.00',
  `prize_money` decimal(10,2) DEFAULT '0.00',
  `format_type` enum('knockout','round_robin','groups_knockout','league','ladder') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('singles','doubles','teams') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','open','closed','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `rules` json DEFAULT NULL,
  `total_collected` decimal(10,2) DEFAULT '0.00',
  `platform_commission_percent` decimal(5,2) DEFAULT '10.00',
  `organizer_payout_status` enum('pending','processing','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `venue_id` (`venue_id`),
  KEY `idx_tournaments_sport` (`sport_id`),
  KEY `idx_tournaments_status` (`status`),
  KEY `idx_tournaments_dates` (`start_date`,`end_date`),
  KEY `idx_tournaments_organizer` (`organizer_id`),
  KEY `idx_tournaments_deleted` (`deleted_at`),
  CONSTRAINT `tournaments_ibfk_1` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`),
  CONSTRAINT `tournaments_ibfk_2` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`),
  CONSTRAINT `tournaments_ibfk_3` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `check_entry_fee` CHECK ((`entry_fee` >= 0)),
  CONSTRAINT `check_prize_money` CHECK ((`prize_money` >= 0)),
  CONSTRAINT `check_registration_dates` CHECK ((`registration_end` <= `start_date`)),
  CONSTRAINT `check_tournament_dates` CHECK ((`end_date` >= `start_date`))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (1,'AMD league','dev',8,3,2,NULL,'2025-11-01','2025-11-08','2025-10-24 00:00:00','2025-10-31 00:00:00',2,0.00,0.00,'knockout','teams','open',NULL,0.00,10.00,'pending',NULL,'2025-10-24 08:07:35','2025-10-24 09:36:16'),(2,'Corporate Badminton','dev',2,4,2,NULL,'2025-11-01','2025-11-08','2025-10-24 15:00:00','2025-10-30 00:00:00',2,0.00,0.00,'knockout','singles','ongoing',NULL,0.00,10.00,'pending',NULL,'2025-10-24 10:55:21','2025-10-27 08:55:46'),(3,'Badminton Championship 2025','Badminton',2,3,1,NULL,'2025-10-28','2025-10-28','2025-10-27 16:05:00','2025-10-27 23:45:00',4,0.00,0.00,'knockout','singles','ongoing',NULL,0.00,10.00,'pending',NULL,'2025-10-27 10:33:22','2025-10-27 11:29:09');
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `achievement_id` int NOT NULL,
  `unlocked_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tournament_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_achievement` (`user_id`,`achievement_id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `idx_user_achievements_user` (`user_id`),
  KEY `idx_user_achievements_achievement` (`achievement_id`),
  CONSTRAINT `user_achievements_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_2` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_achievements_ibfk_3` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_achievements`
--

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `follower_id` int NOT NULL,
  `following_id` int NOT NULL,
  `notification_enabled` tinyint(1) DEFAULT '1',
  `followed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`follower_id`,`following_id`),
  KEY `idx_follows_follower` (`follower_id`),
  KEY `idx_follows_following` (`following_id`),
  CONSTRAINT `user_follows_ibfk_1` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_follows_ibfk_2` FOREIGN KEY (`following_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_follows_chk_1` CHECK ((`follower_id` <> `following_id`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sessions`
--

DROP TABLE IF EXISTS `user_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_token` (`token`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sessions`
--

LOCK TABLES `user_sessions` WRITE;
/*!40000 ALTER TABLE `user_sessions` DISABLE KEYS */;
INSERT INTO `user_sessions` VALUES (1,1,'verify_d623f6a7667a68dd6a47f170db8c77d1044ee7f1ce1e80fdfd54620adf8dd22f','email_verification',NULL,'2025-10-25 13:21:45','2025-10-24 07:51:44'),(4,2,'verify_d889b22eb66bdf946e145cbbdf72a9c150412908ce71ff25e928db79629631b6','email_verification',NULL,'2025-10-25 13:24:47','2025-10-24 07:54:47'),(7,2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyOTI4MzIsImV4cCI6MTc2MTg5NzYzMn0.W4lz5sIj5yjtVmPROmQ5sEb8V6JCSCbjvBcifIf3kWQ','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','::ffff:127.0.0.1','2025-10-31 13:30:32','2025-10-24 08:00:32'),(8,2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEyOTMwOTMsImV4cCI6MTc2MTg5Nzg5M30.pOiZ7avI8zf1EjlS2KBz_FHPTjUBuz8s5-clhPUI9dw','PostmanRuntime/7.49.0','::1','2025-10-31 13:34:53','2025-10-24 08:04:53'),(27,2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEzMDQzNTksImV4cCI6MTc2MTkwOTE1OX0.2N1o_fJKDuDQutn754VrT0lf98nTbHnHn-NggFkA4OM','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','::ffff:127.0.0.1','2025-10-31 16:42:39','2025-10-24 11:12:39'),(28,4,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEzMDY3NjgsImV4cCI6MTc2MTkxMTU2OH0.ZQwtu31NZKEGPQkqqVufetGtU8l03k51Df7zDaaHd0U','Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0','::ffff:127.0.0.1','2025-10-31 17:22:48','2025-10-24 11:52:48'),(29,5,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjEzMDY4MDksImV4cCI6MTc2MTkxMTYwOX0.f5BrlqSqIsBH__uQKsxLuZcEkK-44ksrgvSSGwcr9Vs','Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0','::ffff:127.0.0.1','2025-10-31 17:23:29','2025-10-24 11:53:29'),(31,1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjE1NTI2MzIsImV4cCI6MTc2MjE1NzQzMn0.mVbDOKl90p-eQMM6ZnY74NglVsTkltDGTWBaHpxvxio','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','::ffff:127.0.0.1','2025-11-03 13:40:33','2025-10-27 08:10:32'),(37,5,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjE1NjI0OTgsImV4cCI6MTc2MjE2NzI5OH0.NiJ1EH0Va9avfuFm7u0Ab8RqMjcP-Bcl_XIi7DH5Ofw','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','::ffff:127.0.0.1','2025-11-03 16:24:59','2025-10-27 10:54:58'),(38,2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3NjE1Njc5NDIsImV4cCI6MTc2MjE3Mjc0Mn0.gyzpx1Yv_u6i2fFrPr-Vj_mpilnsl7zX18hUlIlJrYM','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','::ffff:127.0.0.1','2025-11-03 17:55:42','2025-10-27 12:25:42');
/*!40000 ALTER TABLE `user_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sports`
--

DROP TABLE IF EXISTS `user_sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `sport_id` int NOT NULL,
  `skill_level` enum('beginner','intermediate','advanced','professional') COLLATE utf8mb4_unicode_ci DEFAULT 'beginner',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_sport` (`user_id`,`sport_id`),
  KEY `idx_user_sports_user` (`user_id`),
  KEY `idx_user_sports_sport` (`sport_id`),
  CONSTRAINT `user_sports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_sports_ibfk_2` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sports`
--

LOCK TABLES `user_sports` WRITE;
/*!40000 ALTER TABLE `user_sports` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `handedness` enum('left','right','ambidextrous') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('player','admin','scorer','spectator') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'player',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `profile_completion_percentage` int DEFAULT '0',
  `payment_method_verified` tinyint(1) DEFAULT '0',
  `account_age_days` int DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_deleted` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'devplayer@gmail.com','9157567534','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Ajay','Patil','male',NULL,'2009-10-11',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 07:51:44','2025-10-24 07:59:34'),(2,'dev@gmail.com','7285069535','$2a$10$w7JJloN2VbGBuh/M/LG/MOJE6aagAZIEvyy9zw0l9DC3BcKQddGPK',NULL,'John','Doe','male',NULL,'1998-07-30',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 07:54:47','2025-10-24 07:54:47'),(3,'player3@gmail.com','9157567536','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Sneha','Kulkarni','female',NULL,'2010-08-15',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:05','2025-10-24 08:01:05'),(4,'player4@gmail.com','9157567537','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Aditya','Patil','male',NULL,'2007-12-02',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:10','2025-10-24 08:01:10'),(5,'player5@gmail.com','9157567538','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Priya','Deshmukh','female',NULL,'2009-03-11',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:15','2025-10-24 08:01:15'),(6,'player6@gmail.com','9157567539','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Karan','Mehta','male',NULL,'2008-11-30',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:20','2025-10-24 08:01:20'),(7,'player7@gmail.com','9157567540','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Anjali','Rao','female',NULL,'2010-01-19',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:25','2025-10-24 08:01:25'),(8,'player8@gmail.com','9157567541','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Vikram','Iyer','male',NULL,'2007-07-05',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:30','2025-10-24 08:01:30'),(9,'player9@gmail.com','9157567542','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Megha','Sharma','female',NULL,'2009-06-22',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:35','2025-10-24 08:01:35'),(10,'player10@gmail.com','9157567543','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Ritesh','Patel','male',NULL,'2008-09-17',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:40','2025-10-24 08:01:40'),(11,'player2@gmail.com','9157567535','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Rohan','Shah','male',NULL,'2008-05-21',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:00','2025-10-24 08:01:00'),(12,'player11@gmail.com','9157567544','$2a$10$eGbgDIlsebKeK3JHBR8HdeNCDSn/wSbkXy9bN.P/UxuW9LwXz0/aa',NULL,'Sanya','Khan','female',NULL,'2010-02-28',NULL,'player',0,1,0,0,0,NULL,'2025-10-24 08:01:45','2025-10-24 08:01:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_update_account_age` BEFORE UPDATE ON `users` FOR EACH ROW BEGIN
    SET NEW.account_age_days = DATEDIFF(CURRENT_DATE, DATE(NEW.created_at));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Temporary view structure for view `v_live_matches`
--

DROP TABLE IF EXISTS `v_live_matches`;
/*!50001 DROP VIEW IF EXISTS `v_live_matches`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_live_matches` AS SELECT 
 1 AS `match_id`,
 1 AS `tournament_name`,
 1 AS `sport_name`,
 1 AS `current_period`,
 1 AS `period_type`,
 1 AS `participant1_score`,
 1 AS `participant2_score`,
 1 AS `elapsed_time_seconds`,
 1 AS `is_paused`,
 1 AS `match_date`,
 1 AS `match_time`,
 1 AS `venue_name`,
 1 AS `court_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_match_timeline_summary`
--

DROP TABLE IF EXISTS `v_match_timeline_summary`;
/*!50001 DROP VIEW IF EXISTS `v_match_timeline_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_match_timeline_summary` AS SELECT 
 1 AS `match_id`,
 1 AS `total_events`,
 1 AS `scoring_events`,
 1 AS `card_events`,
 1 AS `substitution_events`,
 1 AS `first_event_time`,
 1 AS `last_event_time`,
 1 AS `match_duration_seconds`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_player_match_schedule`
--

DROP TABLE IF EXISTS `v_player_match_schedule`;
/*!50001 DROP VIEW IF EXISTS `v_player_match_schedule`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_player_match_schedule` AS SELECT 
 1 AS `player_id`,
 1 AS `match_id`,
 1 AS `role`,
 1 AS `scheduled_date`,
 1 AS `scheduled_time`,
 1 AS `end_time`,
 1 AS `tournament_id`,
 1 AS `tournament_name`,
 1 AS `round_name`,
 1 AS `match_status`,
 1 AS `court_name`,
 1 AS `venue_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_player_performance_summary`
--

DROP TABLE IF EXISTS `v_player_performance_summary`;
/*!50001 DROP VIEW IF EXISTS `v_player_performance_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_player_performance_summary` AS SELECT 
 1 AS `user_id`,
 1 AS `player_name`,
 1 AS `sport_name`,
 1 AS `total_matches`,
 1 AS `total_wins`,
 1 AS `total_losses`,
 1 AS `win_percentage`,
 1 AS `performance_rating`,
 1 AS `average_score_per_match`,
 1 AS `sport_specific_stats`,
 1 AS `last_match_date`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_referee_workload`
--

DROP TABLE IF EXISTS `v_referee_workload`;
/*!50001 DROP VIEW IF EXISTS `v_referee_workload`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_referee_workload` AS SELECT 
 1 AS `referee_id`,
 1 AS `referee_name`,
 1 AS `total_matches_assigned`,
 1 AS `matches_completed`,
 1 AS `matches_declined`,
 1 AS `reliability_score`,
 1 AS `average_rating`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tournament_creator_dashboard`
--

DROP TABLE IF EXISTS `v_tournament_creator_dashboard`;
/*!50001 DROP VIEW IF EXISTS `v_tournament_creator_dashboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tournament_creator_dashboard` AS SELECT 
 1 AS `tournament_id`,
 1 AS `tournament_name`,
 1 AS `organizer_id`,
 1 AS `status`,
 1 AS `start_date`,
 1 AS `end_date`,
 1 AS `total_participants`,
 1 AS `paid_participants`,
 1 AS `total_collected`,
 1 AS `entry_fee`,
 1 AS `total_matches`,
 1 AS `completed_matches`,
 1 AS `active_disputes`,
 1 AS `court_utilization_percentage`,
 1 AS `match_completion_rate`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tournament_financial_summary`
--

DROP TABLE IF EXISTS `v_tournament_financial_summary`;
/*!50001 DROP VIEW IF EXISTS `v_tournament_financial_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tournament_financial_summary` AS SELECT 
 1 AS `tournament_id`,
 1 AS `tournament_name`,
 1 AS `organizer_id`,
 1 AS `entry_fee`,
 1 AS `total_registrations`,
 1 AS `total_collected`,
 1 AS `platform_commission_percent`,
 1 AS `platform_commission`,
 1 AS `organizer_earnings`,
 1 AS `prize_money`,
 1 AS `escrow_status`,
 1 AS `wallet_balance`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `venue_weather_alerts`
--

DROP TABLE IF EXISTS `venue_weather_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venue_weather_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `venue_id` int NOT NULL,
  `alert_date` date NOT NULL,
  `alert_time` time NOT NULL,
  `weather_condition` enum('rain','storm','extreme_heat','fog','wind') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci NOT NULL,
  `affected_courts` json DEFAULT NULL,
  `action_taken` enum('continue','delay','cancel','monitor') COLLATE utf8mb4_unicode_ci DEFAULT 'monitor',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_weather_venue_date` (`venue_id`,`alert_date`),
  CONSTRAINT `venue_weather_alerts_ibfk_1` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venue_weather_alerts`
--

LOCK TABLES `venue_weather_alerts` WRITE;
/*!40000 ALTER TABLE `venue_weather_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `venue_weather_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venues`
--

DROP TABLE IF EXISTS `venues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postal_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `contact_person` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facilities` json DEFAULT NULL,
  `operating_hours` json DEFAULT NULL,
  `images` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_venues_city` (`city`),
  KEY `idx_venues_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venues`
--

LOCK TABLES `venues` WRITE;
/*!40000 ALTER TABLE `venues` DISABLE KEYS */;
INSERT INTO `venues` VALUES (1,'Greenfield Sports Complex','A modern sports venue with multiple fields and indoor facilities.','123 Sports Avenue','Mumbai','Maharashtra','India','400001',19.07600000,72.87770000,'Rajesh Kumar','+91-9876543210','rajesh.kumar@greenfield.com','https://www.greenfieldsports.com','[\"Football field\", \"Basketball court\", \"Swimming pool\", \"Gym\"]','{\"friday\": \"06:00-22:00\", \"monday\": \"06:00-22:00\", \"sunday\": \"08:00-20:00\", \"tuesday\": \"06:00-22:00\", \"saturday\": \"08:00-20:00\", \"thursday\": \"06:00-22:00\", \"wednesday\": \"06:00-22:00\"}',NULL,1,'2025-10-24 08:05:27','2025-10-24 08:05:27'),(2,'Silverline Sports Arena','Indoor arena hosting basketball, volleyball, and badminton events.','45 Arena Road','Pune','Maharashtra','India','411001',18.52040000,73.85670000,'Anita Deshmukh','+91-9123456780','anita.deshmukh@silverline.com','https://www.silverlinesports.com','[\"Basketball court\", \"Volleyball court\", \"Badminton courts\", \"Fitness center\"]','{\"friday\": \"07:00-21:00\", \"monday\": \"07:00-21:00\", \"sunday\": \"08:00-18:00\", \"tuesday\": \"07:00-21:00\", \"saturday\": \"08:00-18:00\", \"thursday\": \"07:00-21:00\", \"wednesday\": \"07:00-21:00\"}',NULL,1,'2025-10-24 08:05:56','2025-10-24 08:05:56'),(3,'Bluewave Aquatic Center','State-of-the-art swimming and diving facilities for all age groups.','78 Marine Drive','Chennai','Tamil Nadu','India','600028',13.08270000,80.27070000,'Vikram Singh','+91-9988776655','vikram.singh@bluewave.com','https://www.bluewaveaquatic.com','[\"Olympic swimming pool\", \"Diving platforms\", \"Kids pool\", \"Sauna\", \"Gym\"]','{\"friday\": \"06:00-20:00\", \"monday\": \"06:00-20:00\", \"sunday\": \"07:00-19:00\", \"tuesday\": \"06:00-20:00\", \"saturday\": \"07:00-19:00\", \"thursday\": \"06:00-20:00\", \"wednesday\": \"06:00-20:00\"}',NULL,1,'2025-10-24 08:06:01','2025-10-24 08:06:01'),(4,'Horizon Adventure Park','Outdoor adventure sports park with trekking, climbing, and cycling facilities.','12 Hilltop Lane','Bangalore','Karnataka','India','560001',12.97160000,77.59460000,'Meera Iyer','+91-9876501234','meera.iyer@horizonadventure.com','https://www.horizonadventure.com','[\"Trekking trails\", \"Rock climbing walls\", \"Mountain biking\", \"Camping sites\"]','{\"friday\": \"08:00-18:00\", \"monday\": \"08:00-18:00\", \"sunday\": \"06:00-20:00\", \"tuesday\": \"08:00-18:00\", \"saturday\": \"06:00-20:00\", \"thursday\": \"08:00-18:00\", \"wednesday\": \"08:00-18:00\"}',NULL,1,'2025-10-24 08:06:06','2025-10-24 08:06:06');
/*!40000 ALTER TABLE `venues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wallet_id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `payment_id` int DEFAULT NULL,
  `participant_id` int DEFAULT NULL,
  `transaction_type` enum('credit','debit') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `commission_percentage` decimal(5,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `balance_after` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tournament_id` (`tournament_id`),
  KEY `payment_id` (`payment_id`),
  KEY `participant_id` (`participant_id`),
  KEY `idx_wallet_transactions_wallet` (`wallet_id`),
  KEY `idx_wallet_transactions_date` (`created_at`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`wallet_id`) REFERENCES `tournament_creator_wallets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `wallet_transactions_ibfk_2` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`),
  CONSTRAINT `wallet_transactions_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `wallet_transactions_ibfk_4` FOREIGN KEY (`participant_id`) REFERENCES `tournament_participants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_live_matches`
--

/*!50001 DROP VIEW IF EXISTS `v_live_matches`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_live_matches` AS select `m`.`id` AS `match_id`,`t`.`name` AS `tournament_name`,`s`.`name` AS `sport_name`,`lms`.`current_period` AS `current_period`,`lms`.`period_type` AS `period_type`,`lms`.`participant1_score` AS `participant1_score`,`lms`.`participant2_score` AS `participant2_score`,`lms`.`elapsed_time_seconds` AS `elapsed_time_seconds`,`lms`.`is_paused` AS `is_paused`,`m`.`match_date` AS `match_date`,`m`.`match_time` AS `match_time`,`v`.`name` AS `venue_name`,`c`.`name` AS `court_name` from (((((`live_match_state` `lms` join `matches` `m` on((`lms`.`match_id` = `m`.`id`))) join `tournaments` `t` on((`m`.`tournament_id` = `t`.`id`))) join `sports` `s` on((`lms`.`sport_id` = `s`.`id`))) left join `venues` `v` on((`m`.`venue_id` = `v`.`id`))) left join `courts` `c` on((`m`.`court_id` = `c`.`id`))) where (`lms`.`is_live` = true) order by `m`.`match_date`,`m`.`match_time` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_match_timeline_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_match_timeline_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_match_timeline_summary` AS select `mt`.`match_id` AS `match_id`,count(0) AS `total_events`,sum((case when (`mt`.`event_category` = 'score') then 1 else 0 end)) AS `scoring_events`,sum((case when (`mt`.`event_category` = 'card') then 1 else 0 end)) AS `card_events`,sum((case when (`mt`.`event_category` = 'substitution') then 1 else 0 end)) AS `substitution_events`,min(`mt`.`event_time`) AS `first_event_time`,max(`mt`.`event_time`) AS `last_event_time`,max(`mt`.`elapsed_seconds`) AS `match_duration_seconds` from `match_timeline` `mt` group by `mt`.`match_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_player_match_schedule`
--

/*!50001 DROP VIEW IF EXISTS `v_player_match_schedule`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_player_match_schedule` AS select `ps`.`player_id` AS `player_id`,`ps`.`match_id` AS `match_id`,`ps`.`role` AS `role`,`ps`.`scheduled_date` AS `scheduled_date`,`ps`.`scheduled_time` AS `scheduled_time`,`ps`.`end_time` AS `end_time`,`m`.`tournament_id` AS `tournament_id`,`t`.`name` AS `tournament_name`,`m`.`round_name` AS `round_name`,`m`.`status` AS `match_status`,`c`.`name` AS `court_name`,`v`.`name` AS `venue_name` from ((((`player_schedule` `ps` join `matches` `m` on((`ps`.`match_id` = `m`.`id`))) join `tournaments` `t` on((`m`.`tournament_id` = `t`.`id`))) left join `courts` `c` on((`m`.`court_id` = `c`.`id`))) left join `venues` `v` on((`c`.`venue_id` = `v`.`id`))) where (`ps`.`status` = 'confirmed') order by `ps`.`scheduled_date`,`ps`.`scheduled_time` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_player_performance_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_player_performance_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_player_performance_summary` AS select `u`.`id` AS `user_id`,concat(`u`.`first_name`,' ',`u`.`last_name`) AS `player_name`,`s`.`name` AS `sport_name`,`psp`.`total_matches` AS `total_matches`,`psp`.`total_wins` AS `total_wins`,`psp`.`total_losses` AS `total_losses`,`psp`.`win_percentage` AS `win_percentage`,`psp`.`performance_rating` AS `performance_rating`,`psp`.`average_score_per_match` AS `average_score_per_match`,`psp`.`sport_specific_stats` AS `sport_specific_stats`,`psp`.`last_match_date` AS `last_match_date` from ((`player_sport_performance` `psp` join `users` `u` on((`psp`.`user_id` = `u`.`id`))) join `sports` `s` on((`psp`.`sport_id` = `s`.`id`))) order by `s`.`id`,`psp`.`performance_rating` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_referee_workload`
--

/*!50001 DROP VIEW IF EXISTS `v_referee_workload`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_referee_workload` AS select `u`.`id` AS `referee_id`,concat(`u`.`first_name`,' ',`u`.`last_name`) AS `referee_name`,count(`m`.`id`) AS `total_matches_assigned`,sum((case when (`m`.`status` = 'completed') then 1 else 0 end)) AS `matches_completed`,sum((case when (`rar`.`status` = 'declined') then 1 else 0 end)) AS `matches_declined`,`rp`.`reliability_score` AS `reliability_score`,`rp`.`average_rating` AS `average_rating` from (((`users` `u` left join `matches` `m` on((`u`.`id` = `m`.`referee_id`))) left join `referee_assignment_requests` `rar` on(((`m`.`id` = `rar`.`match_id`) and (`u`.`id` = `rar`.`referee_id`)))) left join `referee_performance` `rp` on((`u`.`id` = `rp`.`referee_id`))) where (`u`.`role` in ('player','admin')) group by `u`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tournament_creator_dashboard`
--

/*!50001 DROP VIEW IF EXISTS `v_tournament_creator_dashboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tournament_creator_dashboard` AS select `t`.`id` AS `tournament_id`,`t`.`name` AS `tournament_name`,`t`.`organizer_id` AS `organizer_id`,`t`.`status` AS `status`,`t`.`start_date` AS `start_date`,`t`.`end_date` AS `end_date`,count(distinct `tp`.`id`) AS `total_participants`,sum((case when (`tp`.`payment_status` = 'paid') then 1 else 0 end)) AS `paid_participants`,`t`.`total_collected` AS `total_collected`,`t`.`entry_fee` AS `entry_fee`,count(distinct `m`.`id`) AS `total_matches`,sum((case when (`m`.`status` = 'completed') then 1 else 0 end)) AS `completed_matches`,count(distinct `md`.`id`) AS `active_disputes`,`ta`.`court_utilization_percentage` AS `court_utilization_percentage`,`ta`.`match_completion_rate` AS `match_completion_rate` from ((((`tournaments` `t` left join `tournament_participants` `tp` on((`t`.`id` = `tp`.`tournament_id`))) left join `matches` `m` on((`t`.`id` = `m`.`tournament_id`))) left join `match_disputes` `md` on(((`m`.`id` = `md`.`match_id`) and (`md`.`status` in ('pending','under_review'))))) left join `tournament_analytics` `ta` on((`t`.`id` = `ta`.`tournament_id`))) where (`t`.`deleted_at` is null) group by `t`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tournament_financial_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_tournament_financial_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tournament_financial_summary` AS select `t`.`id` AS `tournament_id`,`t`.`name` AS `tournament_name`,`t`.`organizer_id` AS `organizer_id`,`t`.`entry_fee` AS `entry_fee`,count(distinct `tp`.`id`) AS `total_registrations`,sum((case when (`p`.`status` = 'completed') then `p`.`amount` else 0 end)) AS `total_collected`,`t`.`platform_commission_percent` AS `platform_commission_percent`,((sum((case when (`p`.`status` = 'completed') then `p`.`amount` else 0 end)) * `t`.`platform_commission_percent`) / 100) AS `platform_commission`,((sum((case when (`p`.`status` = 'completed') then `p`.`amount` else 0 end)) * (100 - `t`.`platform_commission_percent`)) / 100) AS `organizer_earnings`,`t`.`prize_money` AS `prize_money`,`ea`.`status` AS `escrow_status`,`tcw`.`balance` AS `wallet_balance` from ((((`tournaments` `t` left join `tournament_participants` `tp` on((`t`.`id` = `tp`.`tournament_id`))) left join `payments` `p` on((`tp`.`id` = `p`.`participant_id`))) left join `escrow_accounts` `ea` on((`t`.`id` = `ea`.`tournament_id`))) left join `tournament_creator_wallets` `tcw` on((`t`.`organizer_id` = `tcw`.`user_id`))) where (`t`.`deleted_at` is null) group by `t`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-27 18:10:30
