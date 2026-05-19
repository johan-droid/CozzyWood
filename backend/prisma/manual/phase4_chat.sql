DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatMessageType') THEN
    CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'GIF');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageType" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
  "text" TEXT NOT NULL,
  "gifUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_createdAt_idx"
ON "ChatMessage"("roomId", "createdAt");

CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx"
ON "ChatMessage"("userId", "createdAt");
