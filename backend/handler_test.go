package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// 使用纯内存的测试桩，不依赖 SQLite 驱动；验证 HTTP 层的所有行为。
type memoryStore struct {
	mu    sync.Mutex
	items map[string]Idea
}

func newMemoryStore() *memoryStore { return &memoryStore{items: make(map[string]Idea)} }
func (m *memoryStore) List(_ context.Context) ([]Idea, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	result := make([]Idea, 0, len(m.items))
	for _, v := range m.items {
		result = append(result, v)
	}
	return result, nil
}
func (m *memoryStore) Create(_ context.Context, v Idea) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items[v.ID] = v
	return nil
}
func (m *memoryStore) UpdateDone(_ context.Context, id string, done bool) (Idea, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	v, ok := m.items[id]
	if !ok {
		return Idea{}, ErrNotFound
	}
	v.Done = done
	m.items[id] = v
	return v, nil
}
func (m *memoryStore) Delete(_ context.Context, id string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.items[id]
	delete(m.items, id)
	return ok, nil
}
func (m *memoryStore) ClearDone(_ context.Context) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var n int64
	for id, v := range m.items {
		if v.Done {
			delete(m.items, id)
			n++
		}
	}
	return n, nil
}
func perform(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func checkStatus(t *testing.T, w *httptest.ResponseRecorder, want int) {
	t.Helper()
	if w.Code != want {
		t.Fatalf("status=%d want=%d body=%s", w.Code, want, w.Body.String())
	}
}
func TestCRUDLifecycle(t *testing.T) {
	h := NewHandler(newMemoryStore())
	checkStatus(t, perform(h, "GET", "/api/health", ""), 200)
	initial := perform(h, "GET", "/api/ideas", "")
	checkStatus(t, initial, 200)
	if strings.TrimSpace(initial.Body.String()) != "[]" {
		t.Fatalf("empty list expected []: %s", initial.Body.String())
	}
	created := perform(h, "POST", "/api/ideas", `{"text":"  学习 Go 后端  ","category":"编程练习"}`)
	checkStatus(t, created, 201)
	var idea Idea
	if err := json.Unmarshal(created.Body.Bytes(), &idea); err != nil {
		t.Fatal(err)
	}
	if idea.ID == "" || idea.Text != "学习 Go 后端" || idea.Done {
		t.Fatalf("unexpected created: %+v", idea)
	}
	listing := perform(h, "GET", "/api/ideas", "")
	checkStatus(t, listing, 200)
	var all []Idea
	if err := json.Unmarshal(listing.Body.Bytes(), &all); err != nil || len(all) != 1 {
		t.Fatal("list failed", err)
	}
	updated := perform(h, "PATCH", "/api/ideas/"+idea.ID, `{"done":true}`)
	checkStatus(t, updated, 200)
	var patched Idea
	if err := json.Unmarshal(updated.Body.Bytes(), &patched); err != nil || !patched.Done {
		t.Fatal("patch failed", err)
	}
	removed := perform(h, "DELETE", "/api/ideas/completed", "")
	checkStatus(t, removed, 200)
	if !strings.Contains(removed.Body.String(), `"deleted":1`) {
		t.Fatalf("not removed: %s", removed.Body.String())
	}
	checkStatus(t, perform(h, "DELETE", "/api/ideas/"+idea.ID, ""), 404)
	created2 := perform(h, "POST", "/api/ideas", `{"text":"second"}`)
	checkStatus(t, created2, 201)
	var second Idea
	_ = json.Unmarshal(created2.Body.Bytes(), &second)
	checkStatus(t, perform(h, "DELETE", "/api/ideas/"+second.ID, ""), 204)
	if errors.Is(nil, ErrNotFound) {
		t.Fatal("unexpected")
	}
}
func TestInvalidRequests(t *testing.T) {
	h := NewHandler(newMemoryStore())
	cases := []struct {
		method, path, body string
		status             int
	}{
		{"POST", "/api/ideas", `{"text":"   "}`, 400},
		{"POST", "/api/ideas", `{"text":12}`, 400},
		{"POST", "/api/ideas", `{"text":"ok","unknown":true}`, 400},
		{"PATCH", "/api/ideas/missing", `{}`, 400},
		{"PATCH", "/api/ideas/missing", `{"done":false}`, 404},
		{"GET", "/api/ideas/missing", "", 405},
	}
	for _, c := range cases {
		w := perform(h, c.method, c.path, c.body)
		checkStatus(t, w, c.status)
	}
}
