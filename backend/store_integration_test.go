package main

import (
	"context"
	"path/filepath"
	"testing"
)

// SQLite 真正读写与重启后的持久化测试。
// 与 handler_test.go 的内存桩测试不同：这里需要已下载 SQLite 驱动。
func TestSQLitePersistence(t *testing.T) {
	path := filepath.Join(t.TempDir(), "ideas.db")
	ctx := context.Background()

	store, err := OpenSQLite(path)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	item := Idea{ID: "test-001", Text: "Go + React", Category: "编程练习", CreatedAt: "2026-10-25T12:00:00Z"}
	if err := store.Create(ctx, item); err != nil {
		t.Fatal(err)
	}
	got, err := store.List(ctx)
	if err != nil || len(got) != 1 || got[0].ID != item.ID || got[0].Done {
		t.Fatalf("list got=%+v err=%v", got, err)
	}
	patched, err := store.UpdateDone(ctx, item.ID, true)
	if err != nil || !patched.Done {
		t.Fatalf("patch got=%+v err=%v", patched, err)
	}
	if err := store.Close(); err != nil {
		t.Fatal(err)
	}

	// 模拟 Go 后端重启，应该能从磁盘 SQLite 文件重新读出数据。
	store, err = OpenSQLite(path)
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer store.Close()
	got, err = store.List(ctx)
	if err != nil || len(got) != 1 || !got[0].Done {
		t.Fatalf("persistence got=%+v err=%v", got, err)
	}
	removed, err := store.ClearDone(ctx)
	if err != nil || removed != 1 {
		t.Fatalf("clear got=%d err=%v", removed, err)
	}
	got, err = store.List(ctx)
	if err != nil || len(got) != 0 {
		t.Fatalf("after clear got=%+v err=%v", got, err)
	}
}
