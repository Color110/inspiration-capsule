# 灵感胶囊：React + Vite + Go + SQLite（全栈教学版）

将原来的 React 页面接入 Go 后端，不再使用 localStorage 保存灵感。

```
idea-lab-go/
├── frontend/
│   ├── src/App.jsx         # React 组件及状态
│   ├── src/api.js          # 前端请求封装
│   ├── src/style.css       # 原有页面风格
│   └── vite.config.js      # /api 代理至 Go 8000 端口
└── backend/
    ├── main.go            # 程序入口/HTTP服务
    ├── handler.go         # API 路由、JSON、输入校验
    ├── store.go           # SQLite 数据访问和建表
    ├── handler_test.go    # 不依赖数据库驱动的路由冒烟测试
    ├── go.mod             # Go依赖
    └── data/ideas.db      # 首次启动后自动生成，未包含在压缩包中
```

## 第0步：检查环境

- `go version`：Go 1.23+（服务使用 Go 1.22+ 路由语法）
- `node -v`、`npm -v`：满足当前 Vite 的 Node.js 版本要求
- 安装依赖时需要联网（Go SQLite驱动及 npm 包）；此压缩包不含 node_modules 和已下载 Go 依赖。

## 第1步：启动Go后端（终端1）

```bash
cd idea-lab-go/backend
go mod tidy
go run .
```

应看到：`Go API: http://127.0.0.1:8000/api/health ...`

浏览器访问 http://127.0.0.1:8000/api/health，预期：`{"status":"ok"}`。
访问 http://127.0.0.1:8000/api/ideas，第一次预期：`[]`。

## 第2步：启动前端（终端2，后端保持运行）

```bash
cd idea-lab-go/frontend
npm install
npm run dev
```

打开终端显示的地址，通常为 http://localhost:5173/。

浏览器向 `/api/ideas` 发起请求，Vite代理转发至 `127.0.0.1:8000`。

## 第3步：手动测试接口

Linux/macOS/WSL/Git Bash：

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/ideas
curl -i -X POST http://127.0.0.1:8000/api/ideas \
  -H 'Content-Type: application/json' \
  -d '{"text":"使用Go开发灵感后端","category":"编程练习"}'
```

响应将包含随机生成的 ID。替换下面的 `<id>`，再测试：

```bash
curl -X PATCH http://127.0.0.1:8000/api/ideas/<id> -H 'Content-Type: application/json' -d '{"done":true}'
curl -X DELETE http://127.0.0.1:8000/api/ideas/completed
```

Windows PowerShell 也可以使用 `Invoke-RestMethod`：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/ideas -ContentType 'application/json' -Body '{"text":"学习Go接口","category":"编程练习"}'
```

## 第4步：测试（HTTP 处理层）

安装依赖后：

```bash
cd backend
go test ./... -v
```

测试用内存仓储模拟数据库，验证路由、输入校验、新增/查询/修改/删除等行为；**不能替代 SQLite 真正读写测试**。

可以尝试在网页添加一条记录后刷新页面、停止并重启Go服务器，确认记录仍存在，并查看 `backend/data/ideas.db` 文件确实已生成。

## 第5步：理解关键知识点

1. `main.go`：Go程序入口 `func main()`；注册SQLite驱动、监听端口。
2. `handler.go`：`net/http`路由、`r.PathValue("id")`、JSON编解码、状态码。
3. `store.go`：`database/sql` 的 `QueryContext`/`ExecContext`，参数化SQL避免注入。
4. `frontend/src/api.js`：所有前端网络请求入口，集中处理报错。
5. `frontend/src/App.jsx`：`useEffect` 加载服务端数据，增删改后更新状态。
6. `frontend/vite.config.js`：开发代理，解决不同端口本地调试的跨域问题。

## 数据迁移的注意点

这个版本不自动导入旧浏览器 `localStorage` 数据。旧数据仍保留在旧页面浏览器存储里，不会自动出现在新数据库中；如需迁移，可后续做一次导入工具。

## 与生产环境的区别

当前是**单用户本地学习版**，默认监听127.0.0.1、不提供登录、权限和多用户隔离。不要直接开放到公网。未来升级可引入JWT/会话、日志、迁移工具、PostgreSQL、Docker与测试环境配置。

## 第6步：用完整链路解释一次 POST 请求

假设用户在网页输入“给高中生做个错题本”。

1. `frontend/src/App.jsx` 的 `handleSubmit` 接收用户输入，先校验不能为空。
2. `frontend/src/api.js` 调用 `fetch('/api/ideas', {method:'POST', body: JSON.stringify(...)})`。
3. `frontend/vite.config.js` 把 `/api` 请求代理到 Go 服务的 8000 端口。
4. `backend/handler.go` 的 `create` 用 `json.Decoder` 解析请求体、检查内容长度，生成唯一 ID 和时间。
5. `backend/store.go` 的 `SQLiteStore.Create` 用占位符 `?` 参数化执行 `INSERT`。
6. 数据库写入成功后，Handler 返回 HTTP 201 和整条 JSON 记录。
7. React 从响应中获得 `id`，调用 `setIdeas` 将记录显示到页面。

如果数据库写入失败，会返回 500；前端会显示错误，不应该假装已保存。

## 第7步：本地测试

```bash
cd backend
go test ./... -v      # 单元测试 + SQLite 集成测试（需要已安装 SQLite 驱动）
go run .             # 启动真实服务
```

新开一个终端：

```bash
cd backend
bash smoke_http.sh   # 真实 HTTP 冒烟测试，需要 curl 和 python3
```

特别推荐手工验证持久化：在网页新建记录 → 关闭 `go run .` → 重新启动 → 浏览器刷新 → 记录依然存在。

## 常见错误

- `missing go.sum entry` / `no required module provides package`：保持联网，在 `backend` 执行 `go mod tidy`；生成 `go.sum` 后可以提交到你自己的 Git 仓库。
- `dial tcp ... proxy.golang.org`：Go 模块代理无法访问，请检查网络和 `go env GOPROXY`，不要把这个错误误认为业务代码错误。
- `bind: address already in use`：8000 端口被占用，停止旧 FastAPI / Go 进程，避免同时启动两个后端。
- 页面提示 `HTTP 502`：确认 Go 后端在 8000 端口正常运行，检查 Vite 代理地址。
- 刷新后没有数据：检查 `backend/data/ideas.db` 是否生成，以及从哪个工作目录启动 `go run .`。
- 已有 React 项目：只需要保留自己的 `frontend`，替换后端并确保 Vite 代理为同一个 8000 端口；`api.js` 协议不变。
