-- 创建 ICU 拼音排序规则（若数据库启用 ICU）
-- 规则名：zh-Hans-CN-x-icu （中国大陆-简体中文拼音）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_collation WHERE collname = 'zh-Hans-CN-x-icu'
  ) THEN
    EXECUTE 'CREATE COLLATION "zh-Hans-CN-x-icu" (provider = icu, locale = ''zh-Hans-CN-x-icu'', deterministic = false)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ICU collation creation failed: %', SQLERRM;
END$$;