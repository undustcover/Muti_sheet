-- 项目级匿名只读开关
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isAnonymousReadEnabled" BOOLEAN NOT NULL DEFAULT false;