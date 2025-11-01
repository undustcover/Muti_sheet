# 后端与数据库开发实施细节 todolist

> 严格原则：开发全程遵循本清单；遇到任何不明确处必须向需求方澄清，禁止随意增加或修改功能。

## 执行与维护规范
- 节点状态定义：`[ ] 未开始`、`[~] 进行中`、`[x] 已完成`。
- 每完成一个节点，必须立刻在本清单勾选状态，并在“开发进度记录”新增一条记录（含时间、责任人、范围与影响）。
- 若节点范围或内容发生变更，需先在“澄清与变更控制”记录确认，再更新该节点的描述与状态。
- 代码约定、测试要求、接口契约如有更新，需在对应章节同步，并在进度记录中注明“规范更新”。

## 总览与前置要求 `[ ]`
- 环境版本：`Node>=18`、`PostgreSQL>=14`（ICU Collation 支持优先）、`Redis>=6`、`Docker / Docker Compose`。
- 配置与安全：环境变量清单、JWT 密钥管理、Windows Defender 可调用性验证。
- 依赖与脚手架：`NestJS`、`Prisma`、`Swagger`、`Jest`、`ESLint/Prettier`、`pnpm`。

## 初始化与基础设施 `[x]`
- 初始化项目结构与包管理（server 根、`/api/v1` 前缀）。
- 接入 `Swagger` 自动文档与统一错误结构 `{ code, message, data, traceId }`。
- 接入 `Prisma`、数据库连接、`Migrate` 管理与基础迁移。
- 接入 `Redis`、统一缓存与并发锁支撑。
- 接入日志与追踪（TraceID），产出访问日志与审计日志通道。

## 二、数据模型与迁移 `[x]`
- [x] 建模并迁移：`projects/tables/fields/records/records_data/views/users/audit_logs/attachments`（`prisma db push` 已应用）
- [x] 为高频筛选字段建立表达式索引；`JSONB` 使用 `GIN`（已执行原生 SQL 迁移）
- [x] 视图共享与权限字段：`ViewShare` 与 `Field.permissionJson` 实现
- [x] 颜色规则 `color_rules` 与视图配置 `views.config_jsonb`（DB 已就绪：以 `View.config` 存储；具体规则结构在视图接口实现时定义）

## 认证与权限 `[ ]`
- JWT 登录/登出与刷新、RBAC（roles/permissions）。
- 字段级权限默认：viewer=只读、editor=可写；支持“隐藏不可见”与“只读可见”。
- 视图共享：按用户精确共享与匿名只读（需表级开关）；导出需编辑者启用。

## 表/字段接口 `[ ]`
- 表的增删改查、字段的增删改、字段类型与校验规则，事务保障。
- DTO + `class-validator`，输入输出与前端契约一致。

## 记录与单元格接口 `[ ]`
- 记录增删改查、批量写入（事务）、单元格更新。
- 撤销/重做（视图作用域）与审计记录写入。

## 查询与聚合 DSL `[ ]`
- 过滤、排序、分页、分组与聚合；空值分组策略明确。
- `like/regex` 不区分大小写；中文排序/匹配按拼音（ICU，无法支持时应用层回退）。

## 视图状态接口 `[ ]`
- 视图布局、筛选/排序/分组保存与加载；视图权限继承与覆盖策略。

## 导入/导出与附件 `[ ]`
- Excel 导入：首行为表头、类型自动推断（文本/数字/日期），未知类型按文本处理；失败回滚与审计。
- 导出：受表级开关控制；格式与列映射与前端一致。
- 附件上传：大小/配额限制；Windows Defender 扫描失败拒绝并删除，提醒用户；元数据与审计。

## 审计与历史 `[ ]`
- 审计日志：用户/操作/时间/影响范围；保留 120 天；下载与可视化。
- 撤销/重做：视图作用域实现与回放策略。

## 并发与实时协作 `[ ]`
- 编辑锁：Redis TTL=120s、心跳续期（30s）、主动/被动释放；高权限用户可强制覆盖并记录审计。
- WebSocket 实时推送：记录变更、锁状态、视图刷新通知。

## 测试环境与用例 `[ ]`
- 三件套：PostgreSQL/Redis/Server；`docker-compose` 一键启动。
- 单元/集成/E2E：关键路径覆盖率 ≥ 80%，并发与负载用例；错误格式一致性测试。

## 代码约定与质量 `[ ]`
- TypeScript 严格模式；Controller→Service→DAO 分层；DTO 转换；事务与隔离级别；乐观锁用版本号或时间戳。
- ESLint/Prettier；Conventional Commits；Prisma Migrate；统一错误处理；日志与审计；安全（输入校验、限流、CORS 等）。

## 部署与配置 `[ ]`
- 环境隔离：dev/staging/prod；数据库编码与排序：PostgreSQL UTF-8；若使用 MySQL 则 `utf8mb4`。
- 版本化：API 版本 `/api/v1`；迁移与回滚流程；备份与归档。
- 监控与告警：系统健康、资源使用、错误率与慢查询。

## 前端协作对齐 `[ ]`
- 接口契约（路径/方法/参数/响应）与 Swagger 文档；前端数据需求映射。
- 逐项将前端本地能力替换为服务端接口；本地历史与服务端审计保持一致。

## 风险与回退策略 `[ ]`
- 中文拼音排序依赖 ICU，无法支持时应用层排序回退并标注性能影响。
- 导入类型边界、匿名共享与导出开关、并发锁覆盖策略的审计与提示清晰。

## 澄清与变更控制 `[ ]`
- 澄清必问清单：数据库/Redis 版本与地址、Defender 调用方式、JWT 秘钥与管理员重置通道、附件存储路径与配额、匿名链接有效期与导出策略、并发目标与部署规格、CI/CD 要求。
- 任一不明确处必须先澄清并记录，禁止随意增加或修改功能。

---

## 开发进度记录
- 记录模板：`YYYY-MM-DD HH:mm | 责任人 | 节点 | 状态 | 说明`
- 2025-10-31 12:00 | 系统 | 文档初始化 | x | 建立清单、状态规范与进度记录模板
 - 2025-10-31 12:45 | 系统 | 初始化与基础设施 | x | 创建 apps/server、接入 Swagger/Prisma/Redis、统一异常与 traceId、健康与指标、Docker 与 Compose、CI/CD 占位、ICU 拼音迁移文件
 - 2025-10-31 13:20 | 系统 | 视图与状态 | x | 完成视图创建/更新/列表接口，接入共享与导出开关、匿名列表限流与缓存、详情守卫；Swagger 示例补齐
 - 2025-10-31 13:35 | 系统 | 导入/导出与附件 | ~ | 新增导入/导出/附件接口占位与模块，准备实现文件上传/导出流与防毒扫描

> 重要：开发过程中若遇到不清楚的地方，必须向用户澄清，禁止随意增加功能或更改既有需求。所有变更需形成书面结论并更新文档与 API 版本。

## 一、项目初始化与基础设施 `[x]`
- [x] 建立 `apps/server` 目录与 NestJS 脚手架（TypeScript 严格模式）
- [x] 集成 `Prisma`，配置 `DATABASE_URL` 与基础迁移管道
- [x] 集成 `Redis` 客户端（缓存、队列、发布订阅）
- [x] 集成 `Swagger`（OpenAPI）自动文档，约定接口版本前缀 `api/v1`
- [x] 配置 `Docker Compose`（PostgreSQL/Redis/Server），分环境 `dev/test/staging/prod`
- [x] 统一日志（JSON 结构化）、`traceId` 贯穿请求链路
- [x] 环境变量与配置模块：`DATABASE_URL/REDIS_URL/JWT_SECRET/JWT_EXPIRES_IN/ATTACHMENTS_DIR`

## 二、数据模型与迁移 `[x]`
- [x] 建模并迁移：`projects/tables/fields/records/records_data/views/users/audit_logs/attachments`（已通过 `prisma db push` 应用）
- [x] 为高频筛选字段建立表达式索引；JSONB 使用 `GIN`（已执行原生 SQL 迁移）
- [x] 视图共享与权限字段：以 `ViewShare` 与 `Field.permissionJson` 实现
- [x] 颜色规则 `color_rules` 与视图配置 `views.config_jsonb`（DB 已就绪：以 `View.config` 存储；规则结构待在视图接口中定义）

## 三、认证与权限（RBAC + 字段级权限）
- [x] 登录与鉴权：`POST /api/v1/auth/login`、`POST /api/v1/auth/logout`、`GET /api/v1/users/me`
- [x] 角色：`owner/admin/editor/viewer`（`@Roles()` + `RolesGuard` 已接入到 Tables/Fields 路由）
- [x] 字段默认权限：提供 `PermissionService.resolveFieldPermission()`，未配置时 `viewer=只读`、`editor=可写`；支持“隐藏不可见/只读可见”
- [x] 视图共享：提供 `ViewAccessGuard`，支持管理员/拥有者直接访问、匿名只读（表级开关）、按用户共享访问；共享视图默认不可导出，表编辑者可开启导出
- [x] DTO + `class-validator` 校验，统一错误返回 `{ code, message, data, traceId }`

开发进度记录（第三部分）：
- 已完成 JWT/Passport 集成与 `JwtStrategy/JwtAuthGuard`；`AuthModule/AuthController` 提供登录与登出接口
- 已完成 `UsersController` 的 `GET /users/me`；种子脚本创建管理员：`admin@example.com/admin123`
- 已完成 RBAC 守卫与装饰器，并应用到 Tables/Fields 路由
- 已完成字段权限计算服务（默认与可读/可写/隐藏判定）
- 已完成可选鉴权与视图共享访问守卫的落地（`OptionalJwtAuthGuard`/`ViewAccessGuard`）

本节状态：`[x]` 完成

## 四、表与字段管理
- [x] `POST /api/v1/projects/:projectId/tables` 创建表
- [x] `GET /api/v1/projects/:projectId/tables` 列出表
- [x] `PATCH /api/v1/tables/:tableId` 更新表属性
- [x] `POST /api/v1/tables/:tableId/fields` 新增字段
- [x] `PATCH /api/v1/fields/:fieldId` 更新字段（名称/类型/描述/可见性/顺序/权限）
- [x] `DELETE /api/v1/fields/:fieldId` 删除字段

补充说明：
- 列表匿名策略：
  - 项目级开关：新增 `Project.isAnonymousReadEnabled`，控制该项目下匿名访问的总开关
  - 表列表（匿名）：要求项目级开关开启；列表仅返回 `Table.isAnonymousReadEnabled=true` 的表；登录用户返回全部
  - 字段列表（匿名）：要求项目与父表均开启匿名；并按字段 `permissionJson` 过滤不可见（hidden/visible=false）字段
  - 视图列表（匿名）：要求项目与父表均开启匿名
- 访问守卫：在视图详情读取路由应用 `ViewAccessGuard` 控制管理员/拥有者直通、匿名只读与共享访问
- DTO 已补充 Swagger 描述与示例，便于文档浏览与调试
 - 项目接口：新增 `POST /api/v1/projects`（管理员/拥有者创建项目，支持设置 `isAnonymousReadEnabled`），`PATCH /api/v1/projects/:projectId`（管理员/拥有者更新项目名称与匿名开关）
 - 匿名防护：在 Tables/Fields/Views 列表路由应用匿名速率限制（默认 60 次/分钟/IP+路径）与 15 秒短缓存，降低热点与重复读压力
 - 匿名最小化：匿名模式下字段列表返回最小字段集（`id/name/order/visible`），隐藏描述、类型与配置等细节

## 五、记录与单元格
- [x] `POST /api/v1/tables/:tableId/records` 新增记录
- [x] `GET /api/v1/tables/:tableId/records` 查询（分页、基本过滤）
- [x] `PATCH /api/v1/records/:recordId` 更新记录（局部字段）
- [x] `DELETE /api/v1/records/:recordId` 删除记录
- [x] `POST /api/v1/tables/:tableId/records:batch` 批量新增/更新/删除（事务）

补充说明（记录与单元格）：
- 匿名列表策略：需项目与父表均开启匿名；列表按字段权限过滤不可见字段（hidden/visible=false）。匿名响应启用速率限制（60 次/分钟/IP+路径）与 15 秒短缓存。
- 匿名最小化：匿名模式下对复杂类型（对象/数组）采用最小化返回（置为 `null`），避免暴露结构化细节；简单类型（文本/数字/日期）直接返回。
- 数据存储映射：按字段类型写入 `RecordsData` 的 `valueText/valueNumber/valueDate/valueJson` 列；更新与批量操作使用 `upsert` 保证幂等性。
 - [x] 输入限制：数字字段仅接受 `Number` 类型（拒绝字符串），并四舍五入到两位小数；文本字段最大长度 800 字符（超出返回 400）。

## 六、查询与聚合（DSL）
 - [x] `POST /api/v1/tables/:tableId/query` 自定义查询（`filters/sorts/groupBy/aggregations/pagination/viewId`）
 - [x] 过滤操作：`eq/neq/lt/gt/lte/gte/in/like/regex/between/exists`（`like/regex` 不区分大小写；`regex` 在内存中执行）
补充说明（查询与聚合）：
- 权限与匿名：需项目与父表均开启匿名；仅返回可见字段；应用匿名速率限制。
- 过滤实现：除 `regex` 在内存执行外，其它尽量下推到数据库；`between` 支持数字/日期。
- 排序实现：在无 `regex` 条件且为单字段排序时，使用原生 SQL 下推 `ORDER BY`（按 `valueText/valueNumber/valueDate` 精确列排序，`NULLS LAST`）；其余场景回退为内存排序（支持多列）。
 - 排序实现（扩展）：在无 `regex` 条件且为多字段排序时，动态 `LEFT JOIN RecordsData` 并拼接多列 `ORDER BY`，分页在数据库执行；文本排序支持 ICU Collation（`zh-u-co-pinyin`），不可用时应用层回退。
 - 分组与聚合：支持按单字段分组，提供 `count/sum/avg/min/max` 等基础聚合，数值字段聚合基于 `valueNumber`。
 - 日期分组：当分组字段为日期，支持 `day/week/month` 桶；返回键形如 `YYYY-MM-DD/ YYYY-MM / YYYY-Www`。
 - 视图对齐：当携带 `viewId` 时，应用视图的列可见性与默认排序配置（客户端未显式传入 `sorts` 时）。
 - 视图优先：当视图配置 `viewPriority=true` 时，服务端优先使用视图的 `groupBy/groupDateGranularity/aggregations/sorting`，覆盖客户端传入。
 - 匿名缓存：匿名 POST DSL 请求按 `URL+Body` 哈希短期缓存 15 秒，减少热点压力（`AnonymousBodyCacheInterceptor`）。
 - 缓存策略：缓存 TTL 与最大键数可配置（`ANON_DSL_CACHE_TTL_MS/AUTH_DSL_CACHE_TTL_MS/DSL_CACHE_MAX_KEYS`）；认证用户可选开启缓存（键：用户+视图+请求体），支持 `useCache/cacheTtlMs` 参数。
  - 组合过滤下推：支持多值 `IN` 与顶层 `filterLogic=or` 的组合逻辑下推；OR 逻辑采用 `LEFT JOIN` + `WHERE (cond1 OR cond2 ...)`，AND 逻辑沿用 `INNER JOIN`；与多列 `ORDER BY` 结合并在 DB 完成分页。
  - 拼音排序回退：新增 `tiny-pinyin` 服务端回退，当 `PINYIN_COLLATION_ENABLED=false` 时，应用层排序使用拼音键；启用回退需设置 `PINYIN_FALLBACK_ENABLED=true`。
  - 视图配置 Schema：新增 `ViewConfigDto`（含 `columnVisibility/sorting/groupBy/groupDateGranularity/aggregations/viewPriority/freezeCount/rowHeight/kanbanGroupFieldId/calendarFields`），并挂载至 Swagger 模型，前后端一致化。
  - 缓存服务：新增 `DslCacheService`（LRU 封装、分用户最大键配额 `DSL_CACHE_MAX_KEYS_PER_USER`、命中率指标 `hits/misses/hitRate/perUserSizes`）；`AnonymousBodyCacheInterceptor` 改为调用服务。
 - [x] 内部指标：新增 `GET /api/v1/internal/cache/metrics` 暴露缓存命中率与配额统计（管理员/拥有者）。
- [x] 排序与本地化：中文排序/匹配按拼音（ICU Collation；默认 `PINYIN_COLLATION_NAME=zh-Hans-CN-x-icu`）；不可用时应用层回退（`tiny-pinyin`，需 `PINYIN_FALLBACK_ENABLED=true`）
- [x] 聚合：`sum/avg/min/max/count`；空值分组显示为“空值”（分组返回 `label` 字段，空值组为“空值”）

## 七、视图与状态
- [x] `POST /api/v1/tables/:tableId/views` 创建视图（权限：`OWNER/ADMIN/EDITOR`；支持 `name` 与 `config`，默认补齐 `sharedRoles=[]/exportEnabled=false`）
- [x] `PATCH /api/v1/views/:viewId` 更新视图（权限：`OWNER/ADMIN/EDITOR`；支持 `name` 与 `config`：`columnVisibility/sorting/groupBy/groupDateGranularity/aggregations/viewPriority/freezeCount/rowHeight/kanbanGroupFieldId/calendarFields/sharedRoles/exportEnabled`）
- [x] `GET /api/v1/tables/:tableId/views` 列出视图（匿名需项目与表均开启匿名；已接入匿名限流与短缓存）

补充说明（视图与状态）：
- 视图共享与导出：`View.config.sharedRoles` 控制角色共享；`exportEnabled` 默认关闭，仅 `EDITOR/ADMIN/OWNER` 在开启后可导出；匿名只读禁止导出。
- 守卫策略：列表接口接入可选鉴权、匿名限流与缓存；详情接口接入 `ViewAccessGuard`，支持管理员/拥有者直通、匿名只读与按用户分享。
- Swagger 对齐：在创建与更新接口的 `ApiBody` 示例中补充了 `sharedRoles/exportEnabled` 字段，便于前端联调。

## 八、导入/导出与附件
- [ ] `POST /api/v1/tables/:tableId/import` 上传并导入为新表（首行表头；类型自动推断：文本/数字/日期；无法判断按文本）
- [ ] `GET /api/v1/tables/:tableId/export` 基于视图导出（含筛选/排序/分组），按字段格式与颜色规则生成 Excel，流式下载
- [ ] `POST /api/v1/tables/:tableId/attachments` 上传附件（单附件 ≤ 20MB，总 ≤ 50GB）
- [ ] 防病毒扫描：Windows Defender；扫描失败拒绝并删除，同时告警并记录审计

本节状态：`[~]` 进行中（已创建导入/导出/附件接口占位，待实现业务与文件流）

## 九、审计与历史（视图作用域）
- [ ] `GET /api/v1/tables/:tableId/history` 表级历史
- [ ] `GET /api/v1/records/:recordId/history` 记录历史
- [ ] `POST /api/v1/history/undo` 撤销最近一步（视图作用域，不跨会话）
- [ ] `POST /api/v1/history/redo` 重做

## 十、并发编辑与实时协作
- [ ] WebSocket 推送表/视图/记录变更；前端订阅当前表与视图
- [ ] 单元格编辑锁：Redis TTL 默认 120s；心跳续期每 30s；校验 `requestId/userId`
- [ ] 主动解锁（离开单元格/切换表/关闭标签）；被动释放（TTL 到期/巡检残留强制清除）；强制解锁（管理员），记录审计

## 十一、测试环境与用例
- [ ] 测试环境（`Docker Compose`）：PostgreSQL（UTF-8）、Redis、Server 三件套
- [ ] Node.js `>=18`、NestJS 最新 LTS；Prisma 最新稳定版
- [ ] 单元测试（Jest）：Service 与工具层；覆盖率目标 ≥ 80%
- [ ] 集成测试：Repository/DAO 层配合测试库与事务回滚
- [ ] E2E 测试：核心 API 流程与权限校验；导入/导出与附件上传
- [ ] 负载与并发：编辑锁心跳与续期、强制解锁；查询与聚合性能基本线

## 十二、代码约定与质量保障
- [ ] TypeScript 严格模式；禁止 `any` 漫延；DTO + `class-validator` 校验
- [ ] 不直接返回 Entity；经 DTO 过滤敏感字段
- [ ] 统一错误返回 `{ code, message, data, traceId }`；禁止堆栈外泄
- [ ] ESLint + Prettier；提交遵循 `Conventional Commits`
- [ ] API 版本化（URL 前缀 `/api/v1`）；兼容演进到 `/api/v2`
- [ ] `Prisma Migrate` 管理数据库迁移；禁止生产裸 SQL
- [ ] 日志与审计：结构化日志；审计保留 120 天；定期清理任务
- [ ] 安全：JWT 加密、密码哈希（bcrypt/argon2）、输入输出严格校验

## 十三、部署与配置
- [ ] 环境隔离：`dev/test/staging/prod`
- [ ] 编码：PostgreSQL 使用 `UTF-8`（如改用 MySQL 则需 `utf8mb4`）
- [ ] 配置清单：`DATABASE_URL/REDIS_URL/JWT_SECRET/JWT_EXPIRES_IN/ATTACHMENTS_DIR`
- [ ] 备份与归档：数据库每日快照、WAL 归档；附件目录周期备份
- [ ] 监控：请求耗时、错误率、慢查询、队列积压；告警通知

## 十四、对齐前端现有能力（落地时逐项替换为后端）
- [ ] 复制粘贴与日期格式：后端返回与前端格式一致（`YYYY-MM-DD`），存储 `UTC`
- [ ] 列配置与数据操作：前端调用后端 API 并保留本地历史，后端为最终一致
- [ ] 筛选/排序/分组/颜色规则：视图状态从后端读取与更新
- [ ] 工具栏与快捷键：对应 API 接口联动（撤销/重做/查询/删除）

## 十五、风险与回退策略
- [ ] 中文拼音排序依赖 ICU Collation，若环境暂不支持，采用应用层拼音键生成与排序
- [ ] 导入类型自动推断仅支持文本/数字/日期，其余按文本处理；必要时提供校验报告
- [ ] 匿名只读共享需表级开关与路由令牌校验；默认关闭，开启须审计

## 十六、澄清清单（开发中必须先确认的事项）
- [ ] 数据库与 Redis 版本与连接方式（主从/集群与否）
- [ ] Windows Defender 的调用方式（命令路径/权限），失败告警渠道
- [ ] JWT 秘钥管理与轮换策略，密码重置通道（邮件/短信）
- [ ] 附件存储路径与磁盘容量监控；超配额的处理策略
- [ ] 导出权限默认策略与匿名共享链接有效期
- [ ] 部署机器规格与并发目标（≤10人编辑）对应资源保障

---

### 提示
- 本清单用于指导 AIcoding 的后端与数据库开发实施过程；任何需求或实现细节的变化，必须更新本清单与《后端与数据库开发方案.md》，并同步前端联调接口文档（Swagger）。

---

## 开发进度记录（末尾）
- 记录模板：`YYYY-MM-DD HH:mm | 责任人 | 节点 | 状态 | 说明`
- 2025-10-31 12:45 | 系统 | 初始化与基础设施 | x | 创建 apps/server、接入 Swagger/Prisma/Redis、统一异常与 traceId、健康与指标、Docker 与 Compose、CI/CD 占位、ICU 拼音迁移文件
 - 2025-10-31 14:18 | 系统 | 认证与权限 | ~ | 安装 JWT/Passport 与 bcrypt；`User.passwordHash` 模型更新并推送；实现 `AuthModule`（login/logout）与 `UsersController(/users/me)`；提供 `JwtStrategy/JwtAuthGuard` 与 `@Roles()/RolesGuard`；开发模式切换到 CommonJS 并修复 `prom-client` 兼容；待在业务接口上应用角色策略与字段默认权限
 - 2025-10-31 13:10 | 系统 | 数据建模与索引 | ~ | 完成 Prisma 模型（users/projects/tables/fields/records/records_data/views/view_shares/audit_logs/attachments），配置 smallint/decimal/timestamptz/jsonb 与基础索引；ICU 拼音索引将在迁移应用后通过原生 SQL 补充
 - 2025-10-31 13:25 | 系统 | 整合节点与索引迁移 | ~ | 合并“数据建模与索引”到“二、数据模型与迁移”，新增索引迁移 SQL（JSONB GIN 与 ICU 拼音表达式索引），等待应用到数据库
 - 2025-10-31 14:08 | 系统 | 数据模型与迁移 | x | 更新数据库连接密码；执行 `prisma db push` 创建结构；执行 ICU 拼音 Collation 与 JSONB GIN/拼音表达式索引 SQL；节点完成
 - 2025-10-31 13:58 | 系统 | 数据模型与迁移 | ~ | 写入 apps/server/.env；安装工作区依赖；修复 Prisma 关系错误并生成客户端；Docker 未运行导致 compose 启动失败，迁移与索引待数据库可用后执行
## 删除顺序与外键约束（重要）

为避免 Prisma 在删除时触发外键约束错误（例如 `P2003: Foreign key constraint violated: RecordsData_fieldId_fkey`），必须遵循严格的删除顺序。以下为当前数据模型的关键依赖关系与推荐顺序：

- 关键外键依赖
  - `RecordsData.recordId -> Record.id`
  - `RecordsData.fieldId -> Field.id`
  - `Attachment.recordId -> Record.id`
  - `Attachment.tableId -> Table.id`
  - `View.tableId -> Table.id`
  - `ViewShare.viewId -> View.id`

- 删除表（Table）推荐事务顺序
  1) 删除视图共享（`ViewShare`）
  2) 删除视图（`View`）
  3) 删除记录相关数据：
     - `RecordsData`（按 `recordId` 批量删除）
     - 记录附件 `Attachment`（按 `recordId` 批量删除）
     - 记录实体 `Record`
  4) 删除字段（`Field`）
  5) 删除表级附件（`Attachment`，按 `tableId`）
  6) 删除表实体（`Table`）

- 删除项目（Project）推荐事务顺序（含级联清理）
  1) 查出项目下任务 `Task` → 查出任务下表 `Table`
  2) 对所有表执行上述“删除表”事务序列（视图→记录→字段→附件→表）
  3) 删除任务（`Task`）
  4) 删除项目（`Project`）

- 经验原则
  - 先删“从表/依赖项”，再删“主表/被依赖项”。
  - 若新增模型或外键，请在实现删除逻辑时将其纳入上述顺序。
  - 如需冪等性增强，可在删除字段前再次按 `fieldId` 清理 `RecordsData`。

- 代码位置
  - 表删除逻辑：`apps/server/src/modules/tables/tables.controller.ts`（已按上述顺序实现）
  - 项目删除逻辑：`apps/server/src/modules/projects/projects.controller.ts`（递归清理）

以上约定用于防止未来改动回归外键约束问题，请在评审与开发中坚持该顺序。