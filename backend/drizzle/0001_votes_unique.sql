CREATE UNIQUE INDEX IF NOT EXISTS votes_user_question_unique
  ON votes ("userId", "questionId") WHERE "questionId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS votes_user_reply_unique
  ON votes ("userId", "replyId") WHERE "replyId" IS NOT NULL;
