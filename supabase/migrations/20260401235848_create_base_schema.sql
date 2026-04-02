/*
  # Create Inter Bogota Supporters Group Base Schema

  1. New Tables
    - `users` - Extended user profile with member information
    - `member_profiles` - Additional member details and preferences
    - `chants` - Library of supporter chants with media
    - `flags_instruments` - Inventory of group equipment
    - `events_calendar` - Match calendar and group events
    - `voting_polls` - Voting system for group decisions
    - `votes` - Individual votes on polls
    - `documents` - Official documentation storage
    - `event_attendance` - Event attendance tracking
    - `forum_posts` - Discussion forum posts
    - `forum_comments` - Comments on forum posts

  2. Security
    - Enable RLS on all tables
    - Create policies for public, private, and admin access
    - Implement role-based access control

  3. Storage Buckets
    - member-photos: User profile photos
    - chant-media: Audio and video files for chants
    - flag-photos: Inventory item photos
    - documents: Official documents and PDFs
    - forum-attachments: Forum post attachments
*/

-- Create extended users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  phone text,
  full_name text NOT NULL,
  photo_url text,
  member_id text UNIQUE NOT NULL,
  join_date timestamptz DEFAULT now(),
  role text DEFAULT 'basic_user' CHECK (role IN ('basic_user', 'coordinator_admin')),
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive', 'banned')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create member profiles table
CREATE TABLE IF NOT EXISTS member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio text,
  position text,
  seniority_level int DEFAULT 1,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chants table
CREATE TABLE IF NOT EXISTS chants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  lyrics text NOT NULL,
  audio_url text,
  video_url text,
  category text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create flags and instruments inventory table
CREATE TABLE IF NOT EXISTS flags_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('flag', 'instrument', 'banner', 'other')),
  photo_url text,
  dimensions text,
  manufacturer text,
  condition text DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  owner uuid REFERENCES users(id) ON DELETE SET NULL,
  acquisition_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events calendar table
CREATE TABLE IF NOT EXISTS events_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('match', 'rehearsal', 'caravan', 'meeting', 'other')),
  title text NOT NULL,
  description text,
  date timestamptz NOT NULL,
  location text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create voting polls table
CREATE TABLE IF NOT EXISTS voting_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'yes_no')),
  options jsonb NOT NULL DEFAULT '[]',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  quorum_required int NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES voting_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('constitution', 'policies', 'legal', 'tax', 'transparency', 'other')),
  file_url text NOT NULL,
  description text,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now()
);

-- Create event attendance table
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events_calendar(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'maybe' CHECK (status IN ('attending', 'not_attending', 'maybe')),
  confirmed_at timestamptz,
  UNIQUE(event_id, user_id)
);

-- Create forum posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_chants_category ON chants(category);
CREATE INDEX IF NOT EXISTS idx_chants_status ON chants(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events_calendar(date);
CREATE INDEX IF NOT EXISTS idx_polls_status ON voting_polls(status);
CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chants ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view public user info"
  ON users FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Member profiles policies
CREATE POLICY "Members can view all profiles"
  ON member_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can update own profile"
  ON member_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON member_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Chants policies
CREATE POLICY "Public can view approved chants"
  ON chants FOR SELECT
  TO anon
  USING (status = 'approved');

CREATE POLICY "Members can view all chants"
  ON chants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can suggest new chants"
  ON chants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND status = 'pending');

CREATE POLICY "Admins can manage all chants"
  ON chants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Flags and instruments policies
CREATE POLICY "Public can view inventory"
  ON flags_instruments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Members can view inventory"
  ON flags_instruments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage inventory"
  ON flags_instruments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Events calendar policies
CREATE POLICY "Public can view calendar"
  ON events_calendar FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Members can view events"
  ON events_calendar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage events"
  ON events_calendar FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Voting polls policies
CREATE POLICY "Members can view active polls"
  ON voting_polls FOR SELECT
  TO authenticated
  USING (status IN ('active', 'closed'));

CREATE POLICY "Admins can manage polls"
  ON voting_polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Votes policies
CREATE POLICY "Members can view their own votes"
  ON votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can vote on active polls"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM voting_polls
      WHERE voting_polls.id = poll_id AND status = 'active'
    )
  );

-- Documents policies
CREATE POLICY "Public can view public documents"
  ON documents FOR SELECT
  TO anon
  USING (is_public = true);

CREATE POLICY "Members can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Event attendance policies
CREATE POLICY "Members can view attendance"
  ON event_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can manage own attendance"
  ON event_attendance FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attendance"
  ON event_attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

-- Forum policies
CREATE POLICY "Members can view forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can create forum posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );

CREATE POLICY "Members can view comments"
  ON forum_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can create comments"
  ON forum_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own comments"
  ON forum_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete comments"
  ON forum_comments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'coordinator_admin'
    )
  );
