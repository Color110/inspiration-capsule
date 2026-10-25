package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// Idea 是数据库记录，同时也是传给 React 的 JSON 数据结构。
type Idea struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Category  string `json:"category"`
	Done      bool   `json:"done"`
	CreatedAt string `json:"created_at"`
}

var ErrNotFound = errors.New("idea not found")

// IdeaStore 定义服务层需要的数据库操作。
// 以后从 SQLite 换到 PostgreSQL，HTTP 层基本不必改。
type IdeaStore interface {
	List(context.Context) ([]Idea, error)
	Create(context.Context, Idea) error
	UpdateDone(context.Context, string, bool) (Idea, error)
	Delete(context.Context, string) (bool, error)
	ClearDone(context.Context) (int64, error)
}

type SQLiteStore struct{ db *sql.DB }

func OpenSQLite(path string) (*SQLiteStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	// 对于学习用的单机 SQLite，用一个连接可以减少写锁竞争。
	db.SetMaxOpenConns(1)
	for _, statement := range []string{
		"PRAGMA busy_timeout = 3000",
		"PRAGMA journal_mode = WAL",
		`CREATE TABLE IF NOT EXISTS ideas (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            category TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)),
            created_at TEXT NOT NULL
        )`,
	} {
		if _, err := db.Exec(statement); err != nil {
			db.Close()
			return nil, fmt.Errorf("db init: %w", err)
		}
	}
	return &SQLiteStore{db: db}, nil
}

func (s *SQLiteStore) Close() error { return s.db.Close() }

func (s *SQLiteStore) List(ctx context.Context) ([]Idea, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, text, category, done, created_at
        FROM ideas ORDER BY created_at DESC, rowid DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Idea, 0) // 保证 JSON 返回 []，而不是 null
	for rows.Next() {
		var item Idea
		if err := rows.Scan(&item.ID, &item.Text, &item.Category, &item.Done, &item.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (s *SQLiteStore) Create(ctx context.Context, idea Idea) error {
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO ideas (id, text, category, done, created_at) VALUES (?, ?, ?, ?, ?)",
		idea.ID, idea.Text, idea.Category, idea.Done, idea.CreatedAt)
	return err
}

func (s *SQLiteStore) UpdateDone(ctx context.Context, id string, done bool) (Idea, error) {
	result, err := s.db.ExecContext(ctx, "UPDATE ideas SET done = ? WHERE id = ?", done, id)
	if err != nil {
		return Idea{}, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return Idea{}, err
	}
	if n == 0 {
		return Idea{}, ErrNotFound
	}
	var idea Idea
	err = s.db.QueryRowContext(ctx, "SELECT id, text, category, done, created_at FROM ideas WHERE id = ?", id).
		Scan(&idea.ID, &idea.Text, &idea.Category, &idea.Done, &idea.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Idea{}, ErrNotFound
	}
	return idea, err
}

func (s *SQLiteStore) Delete(ctx context.Context, id string) (bool, error) {
	result, err := s.db.ExecContext(ctx, "DELETE FROM ideas WHERE id = ?", id)
	if err != nil {
		return false, err
	}
	n, err := result.RowsAffected()
	return n > 0, err
}

func (s *SQLiteStore) ClearDone(ctx context.Context) (int64, error) {
	result, err := s.db.ExecContext(ctx, "DELETE FROM ideas WHERE done = 1")
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
