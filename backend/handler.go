package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

type Server struct{ store IdeaStore }

func NewHandler(store IdeaStore) http.Handler {
	s := &Server{store: store}
	mux := http.NewServeMux()
	// Go 1.22+：直接根据 HTTP 方法和路径注册路由。
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/ideas", s.list)
	mux.HandleFunc("POST /api/ideas", s.create)
	mux.HandleFunc("PATCH /api/ideas/{id}", s.patch)
	mux.HandleFunc("DELETE /api/ideas/completed", s.clearDone)
	mux.HandleFunc("DELETE /api/ideas/{id}", s.delete)
	return mux
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("encode response error: %v", err)
	}
}

func apiError(w http.ResponseWriter, status int, detail string) {
	writeJSON(w, status, map[string]string{"detail": detail})
}

func decodeBody(w http.ResponseWriter, r *http.Request, dst any) error {
	// 限制请求体大小，防止意外的大文件占用服务器内存。
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		if err == nil {
			return errors.New("only one JSON object is allowed")
		}
		return err
	}
	return nil
}

func (s *Server) list(w http.ResponseWriter, r *http.Request) {
	items, err := s.store.List(r.Context())
	if err != nil {
		log.Printf("list: %v", err)
		apiError(w, 500, "读取数据库失败")
		return
	}
	writeJSON(w, 200, items)
}

func randomID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *Server) create(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Text     string `json:"text"`
		Category string `json:"category"`
	}
	if err := decodeBody(w, r, &payload); err != nil {
		apiError(w, 400, "JSON格式错误或参数不符合要求")
		return
	}
	payload.Text = strings.TrimSpace(payload.Text)
	payload.Category = strings.TrimSpace(payload.Category)
	if payload.Category == "" {
		payload.Category = "我的灵感"
	}
	if n := utf8.RuneCountInString(payload.Text); n < 1 || n > 160 {
		apiError(w, 400, "灵感内容长度必须为1到160字")
		return
	}
	if utf8.RuneCountInString(payload.Category) > 30 {
		apiError(w, 400, "分类不能超过30字")
		return
	}
	id, err := randomID()
	if err != nil {
		log.Printf("random: %v", err)
		apiError(w, 500, "生成记录编号失败")
		return
	}
	item := Idea{ID: id, Text: payload.Text, Category: payload.Category, Done: false, CreatedAt: time.Now().UTC().Format(time.RFC3339Nano)}
	if err := s.store.Create(r.Context(), item); err != nil {
		log.Printf("create: %v", err)
		apiError(w, 500, "保存灵感失败")
		return
	}
	writeJSON(w, 201, item)
}

func (s *Server) patch(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Done *bool `json:"done"`
	}
	if err := decodeBody(w, r, &payload); err != nil || payload.Done == nil {
		apiError(w, 400, "请提供布尔类型的done字段")
		return
	}
	item, err := s.store.UpdateDone(r.Context(), r.PathValue("id"), *payload.Done)
	if errors.Is(err, ErrNotFound) {
		apiError(w, 404, "这条灵感不存在")
		return
	}
	if err != nil {
		log.Printf("update: %v", err)
		apiError(w, 500, "更新失败")
		return
	}
	writeJSON(w, 200, item)
}

func (s *Server) delete(w http.ResponseWriter, r *http.Request) {
	deleted, err := s.store.Delete(r.Context(), r.PathValue("id"))
	if err != nil {
		log.Printf("delete: %v", err)
		apiError(w, 500, "删除失败")
		return
	}
	if !deleted {
		apiError(w, 404, "这条灵感不存在")
		return
	}
	w.WriteHeader(http.StatusNoContent) // 204，无响应体，前端不能调用 response.json()
}

func (s *Server) clearDone(w http.ResponseWriter, r *http.Request) {
	count, err := s.store.ClearDone(r.Context())
	if err != nil {
		log.Printf("clear: %v", err)
		apiError(w, 500, "清除失败")
		return
	}
	writeJSON(w, 200, map[string]int64{"deleted": count})
}
