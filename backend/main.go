package main

import (
	"log"
	"net/http"
	"os"
	"time"

	// database/sql 只定义接口，具体的 SQLite 驱动由这个 import 注册。
	_ "modernc.org/sqlite"
)

func main() {
	dbPath := os.Getenv("IDEA_LAB_DB_PATH")
	if dbPath == "" {
		dbPath = "data/ideas.db"
	}
	store, err := OpenSQLite(dbPath)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}
	defer store.Close()

	srv := &http.Server{
		Addr:              "127.0.0.1:8000", // 仅本机访问。部署到公网前需要认证、HTTPS等安全措施。
		Handler:           NewHandler(store),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("Go API: http://%s/api/health | DB: %s", srv.Addr, dbPath)
	log.Fatal(srv.ListenAndServe())
}
