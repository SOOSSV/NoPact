-- NoPact: Multi-tenant platform for music labels
-- Schéma: nopact

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LABELS (Organizations)
-- ============================================================================
CREATE TABLE nopact.labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL
);

-- ============================================================================
-- USERS (Personal accounts)
-- ============================================================================
CREATE TABLE nopact.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handle TEXT NOT NULL UNIQUE, -- Personal ID (user chooses on first login)
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MEMBERSHIPS (User roles in labels)
-- ============================================================================
CREATE TYPE nopact.role_type AS ENUM ('artiste', 'manager', 'producteur', 'label');

CREATE TABLE nopact.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES nopact.labels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES nopact.users(id) ON DELETE CASCADE,
  role nopact.role_type NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(label_id, user_id)
);

-- ============================================================================
-- INVITATIONS (Pending invites)
-- ============================================================================
CREATE TABLE nopact.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES nopact.labels(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role nopact.role_type NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- AGREEMENTS (Contracts/Accords)
-- ============================================================================
CREATE TYPE nopact.recoup_model AS ENUM ('brut', 'part_label', 'plancher');
CREATE TYPE nopact.agreement_status AS ENUM ('en_attente', 'validee', 'signee', 'archivee');

CREATE TABLE nopact.agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label_id UUID NOT NULL REFERENCES nopact.labels(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  status nopact.agreement_status DEFAULT 'en_attente',
  investment NUMERIC(12, 2) DEFAULT 0,
  recoup_model nopact.recoup_model DEFAULT 'brut',
  floor_pct NUMERIC(5, 2) DEFAULT 0,
  created_by UUID NOT NULL REFERENCES nopact.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by_doc TEXT -- Signature doc URL/reference
);

-- ============================================================================
-- SHARES (Proposed % per member)
-- ============================================================================
CREATE TABLE nopact.shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES nopact.agreements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES nopact.users(id) ON DELETE CASCADE,
  proposed_pct NUMERIC(5, 2) NOT NULL,
  validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_memberships_label_id ON nopact.memberships(label_id);
CREATE INDEX idx_memberships_user_id ON nopact.memberships(user_id);
CREATE INDEX idx_invitations_label_id ON nopact.invitations(label_id);
CREATE INDEX idx_invitations_token ON nopact.invitations(token);
CREATE INDEX idx_agreements_label_id ON nopact.agreements(label_id);
CREATE INDEX idx_shares_agreement_id ON nopact.shares(agreement_id);
CREATE INDEX idx_shares_user_id ON nopact.shares(user_id);
