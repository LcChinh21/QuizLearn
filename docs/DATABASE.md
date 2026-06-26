# QuizLearn Database Schema

This document describes the Supabase database schema for QuizLearn.

## Tables

### study_sets

Stores vocabulary study sets created by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PRIMARY KEY | Unique identifier |
| name | text | NOT NULL | Set name |
| words | jsonb | DEFAULT '[]' | Array of word objects |
| author | jsonb | | Author information |
| created_at | timestamp | DEFAULT now() | Creation timestamp |
| updated_at | timestamp | DEFAULT now() | Last update timestamp |

**Words Structure:**
```json
[
  {
    "word": "Algorithm",
    "meaning": "Thuật toán"
  },
  {
    "word": "Database",
    "meaning": "Cơ sở dữ liệu"
  }
]
```

**Author Structure:**
```json
{
  "username": "johndoe",
  "displayName": "John Doe",
  "avatar": "https://..."
}
```

### quizlearn_users

Stores user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| username | text | PRIMARY KEY | Unique username |
| displayName | text | NOT NULL | Display name |
| password | text | NOT NULL | Hashed password |
| avatar | text | DEFAULT '' | Avatar URL |
| created_at | timestamp | DEFAULT now() | Creation timestamp |

## Row Level Security (RLS)

### study_sets

```sql
-- Enable RLS
ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public can view all sets" ON study_sets
    FOR SELECT USING (true);

-- Allow authenticated users to create sets
CREATE POLICY "Users can create sets" ON study_sets
    FOR INSERT WITH CHECK (true);

-- Users can update their own sets
CREATE POLICY "Users can update own sets" ON study_sets
    FOR UPDATE USING (true);

-- Users can delete their own sets
CREATE POLICY "Users can delete own sets" ON study_sets
    FOR DELETE USING (true);
```

### quizlearn_users

```sql
-- Enable RLS
ALTER TABLE quizlearn_users ENABLE ROW LEVEL SECURITY;

-- Allow registration
CREATE POLICY "Public can view users" ON quizlearn_users
    FOR SELECT USING (true);

-- Allow registration
CREATE POLICY "Public can create users" ON quizlearn_users
    FOR INSERT WITH CHECK (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON quizlearn_users
    FOR UPDATE USING (true);
```

## Indexes

```sql
-- Index for faster user lookup
CREATE INDEX idx_users_username ON quizlearn_users(username);

-- Index for faster set lookup by author
CREATE INDEX idx_sets_author ON study_sets((author->>'username'));

-- Index for faster set lookup by date
CREATE INDEX idx_sets_created ON study_sets(created_at DESC);
```

## Migrations

### Initial Setup

```sql
-- Create study_sets table
CREATE TABLE study_sets (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    words JSONB DEFAULT '[]'::jsonb,
    author JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quizlearn_users table
CREATE TABLE quizlearn_users (
    username TEXT PRIMARY KEY,
    displayName TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizlearn_users ENABLE ROW LEVEL SECURITY;

-- Create policies (see RLS section above)
```

## Backup

To backup the database:

```bash
# Export data
pg_dump $DATABASE_URL > backup.sql

# Import data
psql $DATABASE_URL < backup.sql
```

## Monitoring

Use Supabase Dashboard or PostgreSQL monitoring tools to track:
- Query performance
- Table sizes
- Index usage
- Active connections
