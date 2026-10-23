CREATE TABLE IF NOT EXISTS users (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  email varchar(255) NOT NULL UNIQUE,
  "passwordHash" varchar(512),
  "googleId" varchar(255) UNIQUE,
  "firstName" varchar(255) NOT NULL,
  "lastName" varchar(255) NOT NULL,
  username varchar(255),
  "pictureId" varchar(255),
  "pictureUrl" varchar(255),
  "pictureThumbnail" varchar(255),
  role varchar(255) NOT NULL DEFAULT 'student',
  CONSTRAINT users_role_check CHECK (role IN ('student', 'admin', 'tutor')),
  CONSTRAINT users_identity_check CHECK ("googleId" IS NOT NULL OR "passwordHash" IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS courses (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  description varchar(512)
);

CREATE TABLE IF NOT EXISTS "courseAdmins" (
  "courseId" varchar(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "userId" varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY ("courseId", "userId")
);

CREATE TABLE IF NOT EXISTS "courseEnrollments" (
  "courseId" varchar(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "userId" varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY ("courseId", "userId")
);

CREATE TABLE IF NOT EXISTS sections (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description varchar(512),
  "courseId" varchar(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lectures (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  description varchar(512) NOT NULL,
  tags varchar(255),
  "videoLink" varchar(255) NOT NULL,
  notes varchar(255) NOT NULL,
  "audioLink" varchar(255),
  slides varchar(255),
  subtitles varchar(255),
  transcript varchar(255),
  "userId" varchar(36) NOT NULL REFERENCES users(id),
  "courseId" varchar(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  "sectionId" varchar(36) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(tags, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS lectures_search_idx ON lectures USING GIN ("searchVector");

CREATE TABLE IF NOT EXISTS "lectureResources" (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  url varchar(255) NOT NULL,
  type varchar(64) NOT NULL,
  "lectureId" varchar(36) NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  CONSTRAINT "lectureResources_type_check" CHECK (type IN ('short', 'demo', 'quiz'))
);

CREATE TABLE IF NOT EXISTS questions (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  body varchar(1024) NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  "repliesCount" integer NOT NULL DEFAULT 0,
  "userId" varchar(36) NOT NULL REFERENCES users(id),
  "lectureId" varchar(36) REFERENCES lectures(id) ON DELETE CASCADE,
  "courseId" varchar(36) REFERENCES courses(id) ON DELETE CASCADE,
  "searchVector" tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED,
  UNIQUE ("courseId", "lectureId", id)
);

CREATE INDEX IF NOT EXISTS questions_search_idx ON questions USING GIN ("searchVector");

CREATE TABLE IF NOT EXISTS replies (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  upvotes integer NOT NULL DEFAULT 0,
  body varchar(1024) NOT NULL,
  "userId" varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "questionId" varchar(36) NOT NULL REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS votes (
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "userId" varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "questionId" varchar(36) REFERENCES questions(id) ON DELETE CASCADE,
  "replyId" varchar(36) REFERENCES replies(id) ON DELETE CASCADE,
  UNIQUE ("userId", "questionId", "replyId"),
  CONSTRAINT votes_xor_check CHECK (
    ("questionId" IS NOT NULL AND "replyId" IS NULL)
    OR ("questionId" IS NULL AND "replyId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS votes_user_question_unique
  ON votes ("userId", "questionId") WHERE "questionId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS votes_user_reply_unique
  ON votes ("userId", "replyId") WHERE "replyId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS announcements (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  title varchar(255) NOT NULL,
  body varchar(1024) NOT NULL,
  "commentsCount" integer NOT NULL DEFAULT 0,
  "userId" varchar(36) NOT NULL REFERENCES users(id),
  "courseId" varchar(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id varchar(36) PRIMARY KEY,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  body varchar(512) NOT NULL,
  "announcementId" varchar(36) NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  "userId" varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'courses', 'sections', 'lectures', 'lectureResources',
    'questions', 'replies', 'announcements', 'comments'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION increase_question_replies_count()
RETURNS trigger AS $$
BEGIN
  UPDATE questions SET "repliesCount" = "repliesCount" + 1 WHERE id = NEW."questionId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrease_question_replies_count()
RETURNS trigger AS $$
BEGIN
  UPDATE questions SET "repliesCount" = GREATEST("repliesCount" - 1, 0) WHERE id = OLD."questionId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increase_question_replies_count ON replies;
CREATE TRIGGER increase_question_replies_count
AFTER INSERT ON replies
FOR EACH ROW EXECUTE FUNCTION increase_question_replies_count();

DROP TRIGGER IF EXISTS decrease_question_replies_count ON replies;
CREATE TRIGGER decrease_question_replies_count
AFTER DELETE ON replies
FOR EACH ROW EXECUTE FUNCTION decrease_question_replies_count();

CREATE OR REPLACE FUNCTION increase_announcement_comments_count()
RETURNS trigger AS $$
BEGIN
  UPDATE announcements SET "commentsCount" = "commentsCount" + 1 WHERE id = NEW."announcementId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrease_announcement_comments_count()
RETURNS trigger AS $$
BEGIN
  UPDATE announcements SET "commentsCount" = GREATEST("commentsCount" - 1, 0) WHERE id = OLD."announcementId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increase_announcement_comments_count ON comments;
CREATE TRIGGER increase_announcement_comments_count
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION increase_announcement_comments_count();

DROP TRIGGER IF EXISTS decrease_announcement_comments_count ON comments;
CREATE TRIGGER decrease_announcement_comments_count
AFTER DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION decrease_announcement_comments_count();

CREATE OR REPLACE FUNCTION delete_empty_sections()
RETURNS trigger AS $$
BEGIN
  DELETE FROM sections
  WHERE id = OLD."sectionId"
    AND NOT EXISTS (SELECT 1 FROM lectures WHERE "sectionId" = OLD."sectionId");
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS delete_empty_sections ON lectures;
CREATE TRIGGER delete_empty_sections
AFTER DELETE ON lectures
FOR EACH ROW EXECUTE FUNCTION delete_empty_sections();
