import { useEffect, useState } from 'react';
import { prompts, sampleIdeas } from './data/prompts.js';

const STORAGE_KEY = 'idea-lab-notes-v1';

function readIdeas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return sampleIdeas.map(idea => ({ ...idea }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string')
      : [];
  } catch {
    return sampleIdeas.map(idea => ({ ...idea }));
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function IdeaItem({ idea, number, onToggle, onDelete }) {
  return (
    <article className={`idea-item${idea.done ? ' done' : ''}`}>
      <div className="idea-top">
        <span className="idea-index">IDEA / {String(number).padStart(2, '0')}</span>
        <span className="idea-category">{idea.category}</span>
      </div>
      <p className="idea-content">{idea.text}</p>
      <div className="idea-footer">
        <span>{idea.created}</span>
        <div className="idea-controls">
          <button type="button" className="icon-button" onClick={() => onToggle(idea.id)} aria-label={idea.done ? '恢复待实现' : '标记已完成'} title={idea.done ? '恢复待实现' : '标记已完成'}>{idea.done ? '↶' : '✓'}</button>
          <button type="button" className="icon-button delete" onClick={() => onDelete(idea.id)} aria-label="删除这条灵感" title="删除这条灵感">✕</button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [ideas, setIdeas] = useState(readIdeas);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [promptIndex, setPromptIndex] = useState(0);
  const [toast, setToast] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas)); }
    catch (error) { console.warn('本地保存失败', error); }
  }, [ideas]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const prompt = prompts[promptIndex];
  const doneCount = ideas.filter(item => item.done).length;
  const visibleIdeas = ideas.filter(item => filter === 'all' || (filter === 'done' ? item.done : !item.done));

  function addIdea(text, category = '我的灵感') {
    const clean = text.trim();
    if (!clean) return;
    const created = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    setIdeas(current => [{ id: makeId(), text: clean, category, done: false, created }, ...current]);
  }

  function shufflePrompt() {
    setPromptIndex(current => {
      if (prompts.length < 2) return current;
      const offset = 1 + Math.floor(Math.random() * (prompts.length - 1));
      return (current + offset) % prompts.length;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!input.trim()) return;
    addIdea(input);
    setInput('');
    setToast('灵感已装进胶囊！');
  }

  function toggleIdea(id) {
    setIdeas(current => current.map(item => item.id === id ? { ...item, done: !item.done } : item));
  }

  function deleteIdea(id) {
    setIdeas(current => current.filter(item => item.id !== id));
    setToast('已删除这条灵感');
  }

  function clearDone() {
    setIdeas(current => current.filter(item => !item.done));
    setToast('已清理完成的灵感');
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <a href="#top" className="brand" aria-label="灵感胶囊首页"><span className="brand-mark" aria-hidden="true">✳</span><span>idea<span className="brand-dot">.</span>lab</span></a>
        <nav className="nav-links" aria-label="主导航"><a href="#challenge">今日挑战</a><a href="#ideas">我的灵感</a></nav>
        <span className="header-note"><span className="online-dot"></span> MAKE SOMETHING TODAY</span>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-line"></span> LITTLE IDEAS, BIG POSSIBILITIES</span>
            <h1 id="hero-heading">让灵感<br /><em>有处可去<span className="period">.</span></em></h1>
            <p>有时候，一个微不足道的念头，就是下一件有趣事情的开始。抽一张灵感卡，或者把脑海里的闪光点存起来。</p>
            <a href="#challenge" className="hero-cta">开始探索 <span aria-hidden="true">↗</span></a>
            <div className="hero-footnote">✦ 不需要完美，只要开始。</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-grid"></div><div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
            <div className="art-star star-a">✦</div><div className="art-star star-b">✳</div>
            <div className="floating-label top-label">100% ORIGINAL IDEAS</div>
            <div className="capsule"><div className="capsule-shine"></div><span className="capsule-symbol">?</span></div>
            <div className="floating-label bottom-label">OPEN YOUR MIND <span>↗</span></div>
            <div className="tiny-spark spark-one">✧</div><div className="tiny-spark spark-two">✦</div>
          </div>
        </section>
        <section className="main-grid" aria-label="灵感工具">
          <article className="challenge-panel" id="challenge" aria-labelledby="challenge-heading">
            <div className="panel-topline"><span className="section-tag">01 / 每日灵感</span><span className="card-decor">✧</span></div>
            <h2 id="challenge-heading">今天，试试这个。</h2><p className="panel-hint">如果不知道做什么，那就交给一点随机性。</p>
            <div className="prompt-card" aria-live="polite" aria-atomic="true">
              <div className="prompt-top"><span>{prompt.category}</span><span>✦ IDEA NO. {String(promptIndex + 1).padStart(2, '0')}</span></div>
              <p>{prompt.text}</p><div className="prompt-corner">↗</div>
            </div>
            <div className="prompt-actions">
              <button type="button" className="btn btn-dark" onClick={shufflePrompt}><span aria-hidden="true">⟳</span> 换一个灵感</button>
              <button type="button" className="btn btn-outline" onClick={() => { addIdea(prompt.text, '随机挑战'); setToast('已收藏这个灵感 ✦'); }}>＋ 收藏这条</button>
            </div>
          </article>
          <article className="capture-panel" aria-labelledby="capture-heading">
            <div className="panel-topline"><span className="section-tag">02 / 收集想法</span><span className="card-decor">✳</span></div>
            <h2 id="capture-heading">脑海中有个念头？</h2><p className="panel-hint">写下来，它可能会在某天派上用场。</p>
            <form className="idea-form" onSubmit={handleSubmit}>
              <label htmlFor="idea-input">你的新灵感</label>
              <textarea id="idea-input" name="idea" rows={4} maxLength={160} placeholder="比如：做一个会根据天气推荐歌单的网站……" required value={input} onChange={event => setInput(event.target.value)}></textarea>
              <div className="form-bottom"><span className="char-count">{input.length} / 160</span><button type="submit" className="btn btn-accent">存入胶囊 <span aria-hidden="true">↗</span></button></div>
            </form>
            <div className="capture-note"><span aria-hidden="true">↳</span> 所有灵感只保存在你的浏览器里。</div>
          </article>
        </section>
        <section className="collection" id="ideas" aria-labelledby="collection-heading">
          <div className="collection-header">
            <div><span className="eyebrow"><span className="eyebrow-line"></span> YOUR LITTLE UNIVERSE</span><h2 id="collection-heading">我的灵感收藏 <span className="count-pill">{ideas.length}</span></h2><p>把想法变成作品，从留下第一条记录开始。</p></div>
            <div className="collection-tools" role="group" aria-label="筛选灵感">
              {[['all', '全部'], ['active', '待实现'], ['done', '已完成']].map(([value, label]) => (
                <button key={value} type="button" className={`filter-btn${filter === value ? ' active' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="idea-list" aria-live="polite">
            {visibleIdeas.map((idea, index) => <IdeaItem key={idea.id} idea={idea} number={index + 1} onToggle={toggleIdea} onDelete={deleteIdea} />)}
          </div>
          {visibleIdeas.length === 0 && <p className="empty-state">这里还空空的。试着收藏第一个灵感吧！ ✨</p>}
          <div className="collection-bottom"><span>已完成 {doneCount} 个创意，下一件作品正在路上。</span><button type="button" className="text-button" disabled={doneCount === 0} onClick={clearDone}>清除已完成 ↗</button></div>
        </section>
      </main>
      <footer className="site-footer"><span>✳ idea.lab</span><span>为所有脑袋里装着奇怪点子的人而做。</span><a href="#top">回到顶部 ↑</a></footer>
      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
