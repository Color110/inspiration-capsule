import { useEffect, useState } from 'react';
import { api } from './api.js';

const prompts = [
  { category: '创意实验', text: '把今天最普通的一件事，设计成一个有趣的小产品。' },
  { category: '设计挑战', text: '给一家开在月球上的咖啡馆，设计一句广告语。' },
  { category: '生活观察', text: '找出生活里三个微小的不方便，选一个用网页来解决。' },
  { category: '编程练习', text: '做一个页面，让每次点击按钮都出现一种全新的天气。' },
  { category: '脑洞时间', text: '如果植物能够发消息，它今天最想告诉你什么？' },
  { category: '产品想法', text: '发明一个只有一个按钮，却让人愿意每天打开的 App。' },
  { category: '创意实验', text: '用三种颜色、两个圆和一句话，讲一个完整的故事。' },
  { category: '编程练习', text: '设计一个只有你自己能看懂的秘密日记网页。' },
  { category: '生活观察', text: '记录今天让你微笑的一个细节，并做成一张数字明信片。' },
  { category: '产品想法', text: '如果你能帮十年前的自己做一个工具，那会是什么？' },
];

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatCreated(dateString) {
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? '未知日期' : parsed.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function Header() {
  return (
    <header className="site-header">
      <a href="#top" className="brand" aria-label="灵感胶囊首页">
        <span className="brand-mark" aria-hidden="true">✳</span>
        <span>idea<span className="brand-dot">.</span>lab</span>
      </a>
      <nav className="nav-links" aria-label="主导航">
        <a href="#challenge">今日挑战</a>
        <a href="#ideas">我的灵感</a>
      </nav>
      <span className="header-note"><span className="online-dot" /> MAKE SOMETHING TODAY</span>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-line" /> LITTLE IDEAS, BIG POSSIBILITIES</span>
        <h1 id="hero-heading">让灵感<br /><em>有处可去<span className="period">.</span></em></h1>
        <p>有时候，一个微不足道的念头，就是下一件有趣事情的开始。抽一张灵感卡，或者把脑海里的闪光点存起来。</p>
        <a href="#challenge" className="hero-cta">开始探索 <span aria-hidden="true">↗</span></a>
        <div className="hero-footnote">✦ 不需要完美，只要开始。</div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-grid" />
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-star star-a">✦</div>
        <div className="art-star star-b">✳</div>
        <div className="floating-label top-label">100% ORIGINAL IDEAS</div>
        <div className="capsule"><div className="capsule-shine" /><span className="capsule-symbol">?</span></div>
        <div className="floating-label bottom-label">OPEN YOUR MIND <span>↗</span></div>
        <div className="tiny-spark spark-one">✧</div>
        <div className="tiny-spark spark-two">✦</div>
      </div>
    </section>
  );
}

function ChallengePanel({ prompt, index, onShuffle, onSave }) {
  return (
    <article className="challenge-panel" id="challenge" aria-labelledby="challenge-heading">
      <div className="panel-topline"><span className="section-tag">01 / 每日灵感</span><span className="card-decor">✧</span></div>
      <h2 id="challenge-heading">今天，试试这个。</h2>
      <p className="panel-hint">如果不知道做什么，那就交给一点随机性。</p>
      <div className="prompt-card" aria-live="polite" aria-atomic="true">
        <div className="prompt-top"><span id="prompt-category">{prompt.category}</span><span>✦ IDEA NO. <span id="prompt-number">{String(index + 1).padStart(2, '0')}</span></span></div>
        <p id="prompt-text">{prompt.text}</p>
        <div className="prompt-corner">↗</div>
      </div>
      <div className="prompt-actions">
        <button type="button" className="btn btn-dark" onClick={onShuffle}><span aria-hidden="true">⟳</span> 换一个灵感</button>
        <button type="button" className="btn btn-outline" onClick={onSave}>＋ 收藏这条</button>
      </div>
    </article>
  );
}

function CapturePanel({ input, onInputChange, onSubmit, busy }) {
  return (
    <article className="capture-panel" aria-labelledby="capture-heading">
      <div className="panel-topline"><span className="section-tag">02 / 收集想法</span><span className="card-decor">✳</span></div>
      <h2 id="capture-heading">脑海中有个念头？</h2>
      <p className="panel-hint">写下来，它可能会在某天派上用场。</p>
      <form className="idea-form" onSubmit={onSubmit}>
        <label htmlFor="idea-input">你的新灵感</label>
        <textarea
          id="idea-input"
          name="idea"
          rows={4}
          maxLength={160}
          placeholder="比如：做一个会根据天气推荐歌单的网站……"
          required
          disabled={busy}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <div className="form-bottom">
          <span className="char-count">{input.length} / 160</span>
          <button type="submit" className="btn btn-accent" disabled={busy}>存入胶囊 <span aria-hidden="true">↗</span></button>
        </div>
      </form>
      <div className="capture-note"><span aria-hidden="true">↳</span> 你的灵感已保存在后端 SQLite 数据库中。</div>
    </article>
  );
}

// JSX 组件接收数据 props，而不是 document.createElement() 手动创建卡片。
function IdeaCard({ idea, index, onToggle, onDelete, busy }) {
  return (
    <article className={`idea-item${idea.done ? ' done' : ''}`}>
      <div className="idea-top">
        <span className="idea-index">IDEA / {String(index + 1).padStart(2, '0')}</span>
        <span className="idea-category">{idea.category}</span>
      </div>
      <p className="idea-content">{idea.text}</p>
      <div className="idea-footer">
        <span>{formatCreated(idea.created_at)}</span>
        <div className="idea-controls">
          <button type="button" className="icon-button" title={idea.done ? '恢复待实现' : '标记已完成'}
            aria-label={idea.done ? '恢复待实现' : '标记已完成'} disabled={busy} onClick={() => onToggle(idea.id)}>
            {idea.done ? '↶' : '✓'}
          </button>
          <button type="button" className="icon-button delete" title="删除这条灵感"
            aria-label="删除这条灵感" disabled={busy} onClick={() => onDelete(idea.id)}>✕</button>
        </div>
      </div>
    </article>
  );
}

function IdeaCollection({ ideas, filter, onFilterChange, onToggle, onDelete, onClearDone, busy }) {
  const filteredIdeas = ideas.filter((idea) => filter === 'all' || (filter === 'done' ? idea.done : !idea.done));
  const doneCount = ideas.filter((idea) => idea.done).length;
  const filters = [
    { value: 'all', label: '全部' },
    { value: 'active', label: '待实现' },
    { value: 'done', label: '已完成' },
  ];
  return (
    <section className="collection" id="ideas" aria-labelledby="collection-heading">
      <div className="collection-header">
        <div>
          <span className="eyebrow"><span className="eyebrow-line" /> YOUR LITTLE UNIVERSE</span>
          <h2 id="collection-heading">我的灵感收藏 <span className="count-pill">{ideas.length}</span></h2>
          <p>把想法变成作品，从留下第一条记录开始。</p>
        </div>
        <div className="collection-tools" role="group" aria-label="筛选灵感">
          {filters.map((item) => (
            <button key={item.value} type="button"
              className={`filter-btn${filter === item.value ? ' active' : ''}`}
              aria-pressed={filter === item.value}
              onClick={() => onFilterChange(item.value)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="idea-list" aria-live="polite">
        {filteredIdeas.map((idea, index) => (
          <IdeaCard key={idea.id} idea={idea} index={index} onToggle={onToggle} onDelete={onDelete} busy={busy} />
        ))}
      </div>
      {filteredIdeas.length === 0 && <p className="empty-state">这里还空空的。试着收藏第一个灵感吧！ ✨</p>}
      <div className="collection-bottom">
        <span>已完成 {doneCount} 个创意，下一件作品正在路上。</span>
        <button type="button" className="text-button" onClick={onClearDone} disabled={busy || doneCount === 0}>清除已完成 ↗</button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>✳ idea.lab</span>
      <span>为所有脑袋里装着奇怪点子的人而做。</span>
      <a href="#top">回到顶部 ↑</a>
    </footer>
  );
}

export default function App() {
  const [ideas, setIdeas] = useState([]); // ← 由服务器 GET 获取，不再从 localStorage 读
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [promptIndex, setPromptIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const prompt = prompts[promptIndex];

  // 第一次渲染时发送 GET /api/ideas，加载数据库中的记录。
  // 开发模式 StrictMode 会额外执行一次 setup/cleanup，AbortController 可避免旧响应覆盖新数据。
  useEffect(() => {
    const controller = new AbortController();
    api.listIdeas(controller.signal)
      .then((items) => {
        setIdeas(items);
        setError('');
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(`加载失败：${err.message}。请检查后端是否启动。`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(message) {
    setToast({ id: makeId(), message });
  }

  // 所有写操作采用“后端成功后再更新 React 状态”，避免界面显示了实际上未保存的记录。
  async function runMutation(operation) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (err) {
      setError(`操作失败：${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleShuffle() {
    setPromptIndex((previous) =>
      (previous + 1 + Math.floor(Math.random() * (prompts.length - 1))) % prompts.length
    );
  }

  function handleSavePrompt() {
    runMutation(async () => {
      const item = await api.createIdea(prompt.text, '随机挑战'); // POST
      setIdeas((old) => [item, ...old]);
      notify('已收藏这个灵感 ✦');
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    runMutation(async () => {
      const item = await api.createIdea(text, '我的灵感'); // POST
      setIdeas((old) => [item, ...old]);
      setInput('');
      notify('灵感已装进胶囊！');
    });
  }

  function handleToggle(id) {
    const current = ideas.find((item) => item.id === id);
    if (!current) return;
    runMutation(async () => {
      const updated = await api.updateIdea(id, !current.done); // PATCH
      setIdeas((old) => old.map((item) => item.id === id ? updated : item));
      notify(updated.done ? '恭喜！又完成了一个小目标。' : '已移回待实现清单');
    });
  }

  function handleDelete(id) {
    runMutation(async () => {
      await api.deleteIdea(id); // DELETE
      setIdeas((old) => old.filter((item) => item.id !== id));
      notify('已删除这条灵感');
    });
  }

  function handleClearDone() {
    runMutation(async () => {
      const result = await api.clearDone(); // DELETE /completed
      setIdeas((old) => old.filter((item) => !item.done));
      notify(`已清除 ${result.deleted} 条完成的灵感`);
    });
  }

  return (
    <div className="page-shell">
      <Header />
      <main id="top">
        <Hero />
        <section className="main-grid" aria-label="灵感工具">
          <ChallengePanel prompt={prompt} index={promptIndex} onShuffle={handleShuffle} onSave={handleSavePrompt} />
          <CapturePanel input={input} onInputChange={setInput} onSubmit={handleSubmit} busy={busy} />
        </section>
        {loading && <p role="status" style={{ margin: '2rem auto', textAlign: 'center' }}>正在从后端读取灵感…</p>}
        {error && <p role="alert" style={{ color: '#ad3333', padding: '12px 20px', textAlign: 'center' }}>{error}</p>}
        <IdeaCollection ideas={ideas} filter={filter} onFilterChange={setFilter}
          onToggle={handleToggle} onDelete={handleDelete} onClearDone={handleClearDone} busy={busy} />
      </main>
      <Footer />
      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast?.message ?? ''}</div>
    </div>
  );
}
