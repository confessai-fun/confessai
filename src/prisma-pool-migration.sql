-- Add these fields to your PoolPayout model if they don't exist:
-- Run: npx prisma db push (or add to migration)

-- PoolPayout table needs these columns:
ALTER TABLE "PoolPayout" ADD COLUMN IF NOT EXISTS "claimed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PoolPayout" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP;
ALTER TABLE "PoolPayout" ADD COLUMN IF NOT EXISTS "txHash" TEXT;

-- If you're using Prisma schema, add/update the model:
-- 
-- model PoolPayout {
--   id        String    @id @default(cuid())
--   poolId    String
--   userId    String
--   rank      Int
--   amount    Float
--   claimed   Boolean   @default(false)
--   claimedAt DateTime?
--   txHash    String?
--   createdAt DateTime  @default(now())
--   pool      BaptismPool @relation(fields: [poolId], references: [id])
--   user      User        @relation(fields: [userId], references: [id])
-- }
