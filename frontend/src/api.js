/** 前端唯一的 API 访问入口。UI 不再直接操作浏览器 localStorage。 */
async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `请求失败：HTTP ${response.status}`;
    try {
      const error = await response.json();
      if (typeof error.detail === 'string') message = error.detail;
    } catch {
      // 错误响应不一定是 JSON（例如反向代理的 502 HTML）
    }
    throw new Error(message);
  }
  // 删除成功（204）没有响应体，不能再调用 response.json()。
  return response.status === 204 ? null : response.json();
}

export const api = {
  listIdeas: (signal) => request('/ideas', { signal }),
  createIdea: (text, category) => request('/ideas', {
    method: 'POST',
    body: JSON.stringify({ text, category }),
  }),
  updateIdea: (id, done) => request(`/ideas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  }),
  deleteIdea: (id) => request(`/ideas/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearDone: () => request('/ideas/completed', { method: 'DELETE' }),
};
