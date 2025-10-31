-- JSONB 与表达式索引
CREATE INDEX IF NOT EXISTS idx_records_data_valuejson_gin ON "RecordsData" USING GIN ("valueJson");
CREATE INDEX IF NOT EXISTS idx_view_config_gin ON "View" USING GIN ("config");
CREATE INDEX IF NOT EXISTS idx_field_permission_gin ON "Field" USING GIN ("permissionJson");

-- ICU 拼音排序表达式索引（依赖已创建的 zh-Hans-CN-x-icu Collation）
CREATE INDEX IF NOT EXISTS idx_table_name_icu ON "Table" ((name COLLATE "zh-Hans-CN-x-icu"));
CREATE INDEX IF NOT EXISTS idx_records_data_valuetext_icu ON "RecordsData" (("valueText" COLLATE "zh-Hans-CN-x-icu"));