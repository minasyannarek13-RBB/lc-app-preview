(() => {
  "use strict";

  const PAGE_SIZE = 12;
  const SEARCH_MIN = 2;
  const SEARCH_DELAY = 300;
  const REPORT_REASONS = [
    ["spam", "Spam"],
    ["abuse", "Abuse or harassment"],
    ["illegal_content", "Illegal content"],
    ["other", "Other"]
  ];

  const state = {
    client: null,
    user: null,
    profile: null,
    mounted: false,
    tab: "following",
    posts: [],
    cursor: null,
    hasMore: true,
    loading: false,
    error: "",
    searchTimer: 0,
    searchResults: [],
    blockedIds: new Set(),
    followingIds: new Set(),
    commentsByPost: new Map(),
    notificationCount: 0
  };

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function message(error) {
    const raw = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    if (/duplicate|23505/.test(raw)) return "Already submitted.";
    if (/permission|policy|rls|not authorized|42501/.test(raw)) return "This action is not available.";
    if (/network|fetch|failed/i.test(raw)) return "Connection issue. Try again.";
    if (/reply|single level/.test(raw)) return "Replies are limited to one level.";
    return "Something went wrong. Please try again.";
  }

  function toast(text) {
    if (typeof window.showToast === "function") window.showToast(text);
    else {
      const node = q("#toast");
      if (!node) return;
      node.textContent = text;
      node.classList.add("show");
      window.setTimeout(() => node.classList.remove("show"), 1400);
    }
  }

  function avatar(profile) {
    return profile?.avatar_url || "app-icon-512.png";
  }

  function displayName(profile) {
    return profile?.display_name || profile?.username || "LC App user";
  }

  function username(profile) {
    return profile?.username ? `@${profile.username}` : "";
  }

  function relTime(value) {
    const ts = value ? new Date(value).getTime() : Date.now();
    const diff = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.round(diff / 60)}m`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h`;
    return `${Math.round(diff / 86400)}d`;
  }

  function profileColumns() {
    return "id,username,display_name,avatar_url,bio,country,languages,last_seen_at,role";
  }

  function injectStyles() {
    if (q("#lcSocialStyles")) return;
    const style = document.createElement("style");
    style.id = "lcSocialStyles";
    style.textContent = `
      .screen.lc-social-active .dealer-rail-inline,.screen.lc-social-active .dealer-rail-drawer,.screen.lc-social-active .progress{display:none!important}
      .screen.lc-social-active .tabs{display:flex;gap:8px;padding:8px 14px 7px;overflow:auto;scrollbar-width:none}
      .lc-social-tab{min-height:32px;border:1px solid rgba(46,230,206,.18);border-radius:999px;background:rgba(255,255,255,.06);color:var(--soft);padding:0 12px;font-size:11px;font-weight:800;white-space:nowrap}
      .lc-social-tab.active{background:rgba(46,230,206,.16);border-color:rgba(46,230,206,.5);color:#a7fff4}
      .lc-social-feed{min-height:100%;padding:12px 14px 118px;display:grid;gap:12px;background:radial-gradient(circle at 85% 10%,rgba(46,230,206,.12),transparent 34%)}
      .lc-social-card{border:1px solid rgba(46,230,206,.14);border-radius:20px;background:rgba(8,13,16,.84);box-shadow:0 18px 48px rgba(0,0,0,.22);backdrop-filter:blur(18px);overflow:hidden}
      .lc-social-pad{padding:14px}.lc-social-top{display:flex;align-items:center;gap:10px}.lc-social-top img{width:42px;height:42px;border-radius:14px;object-fit:cover;border:1px solid rgba(255,255,255,.12)}
      .lc-social-top strong{display:block;color:var(--text);font-size:13px}.lc-social-top span{display:block;color:var(--muted);font-size:10px}.lc-social-spacer{flex:1}
      .lc-social-body{margin:12px 0 0;color:var(--text);font-size:14px;line-height:1.42;white-space:pre-wrap}.lc-social-muted{color:var(--muted);font-size:11px;line-height:1.35}
      .lc-social-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.lc-social-btn{min-height:34px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.06);color:var(--text);padding:0 11px;font-size:11px;font-weight:800}
      .lc-social-btn.primary{background:linear-gradient(135deg,var(--teal),#a7fff4);color:#031412;border:0}.lc-social-btn.danger{border-color:rgba(239,68,68,.36);color:#ffb4b4;background:rgba(239,68,68,.12)}
      .lc-social-btn.active{border-color:rgba(46,230,206,.55);background:rgba(46,230,206,.14);color:#a7fff4}.lc-social-btn:disabled{opacity:.55}
      .lc-social-input,.lc-social-textarea,.lc-social-select{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(255,255,255,.06);color:var(--text);padding:11px 12px;font:inherit;font-size:13px;outline:none}
      .lc-social-textarea{min-height:82px;resize:vertical}.lc-social-input:focus,.lc-social-textarea:focus,.lc-social-select:focus{border-color:rgba(46,230,206,.62);box-shadow:0 0 0 3px rgba(46,230,206,.08)}
      .lc-social-empty{text-align:center;padding:42px 20px}.lc-social-empty h3{margin:0 0 8px;color:var(--text);font-size:18px}.lc-social-empty p{margin:0 0 16px;color:var(--muted);font-size:12px;line-height:1.4}
      .lc-social-search{display:grid;gap:10px}.lc-social-row{display:flex;gap:10px;align-items:center;padding:11px 12px;border-top:1px solid rgba(255,255,255,.08)}
      .lc-social-row:first-child{border-top:0}.lc-social-row img{width:44px;height:44px;border-radius:15px;object-fit:cover}.lc-social-row-main{min-width:0;flex:1}.lc-social-row-main strong{display:block;font-size:13px;color:var(--text)}.lc-social-row-main span{display:block;font-size:10px;color:var(--muted)}
      .lc-social-counts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.lc-social-count{padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.04)}.lc-social-count strong{display:block;font-size:18px}.lc-social-count span{color:var(--muted);font-size:10px}
      .lc-comments{border-top:1px solid rgba(255,255,255,.08);margin-top:12px;padding-top:10px;display:grid;gap:8px}.lc-comment{padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.05)}.lc-comment.reply{margin-left:22px}.lc-comment-head{display:flex;gap:8px;align-items:center}.lc-comment-head img{width:26px;height:26px;border-radius:9px;object-fit:cover}.lc-comment p{margin:6px 0 0;font-size:12px;line-height:1.36;color:var(--text);white-space:pre-wrap}
      .lc-social-sheet{position:absolute;inset:auto 10px calc(96px + env(safe-area-inset-bottom)) 10px;z-index:85;border:1px solid rgba(46,230,206,.18);border-radius:22px;background:rgba(6,10,12,.96);box-shadow:0 24px 70px rgba(0,0,0,.44);padding:14px;backdrop-filter:blur(20px)}
      .lc-social-sheet[hidden]{display:none!important}.lc-social-sheet-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.lc-social-sheet-head strong{font-size:15px}.lc-social-form{display:grid;gap:10px}
      .lc-social-badge{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(46,230,206,.26);border-radius:999px;color:#a7fff4;background:rgba(46,230,206,.1);padding:4px 8px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}
      .lc-social-skeleton{height:146px;border-radius:20px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(46,230,206,.12),rgba(255,255,255,.05));background-size:220% 100%;animation:lcSocialPulse 1.2s ease-in-out infinite}
      @keyframes lcSocialPulse{0%{background-position:0 0}100%{background-position:-220% 0}}
      @media(max-width:390px){.lc-social-feed{padding-left:10px;padding-right:10px}.lc-social-row{align-items:flex-start}.lc-social-actions{gap:6px}.lc-social-btn{padding:0 9px}}
    `;
    document.head.appendChild(style);
  }

  async function ownUser() {
    const { data, error } = await state.client.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function refreshRelations() {
    if (!state.user) return;
    const [following, blocks] = await Promise.all([
      state.client.from("follows").select("following_id").eq("follower_id", state.user.id),
      state.client.from("user_blocks").select("blocked_id").eq("blocker_id", state.user.id)
    ]);
    if (!following.error) state.followingIds = new Set((following.data || []).map((row) => row.following_id));
    if (!blocks.error) state.blockedIds = new Set((blocks.data || []).map((row) => row.blocked_id));
  }

  async function fetchProfiles(ids) {
    const cleanIds = [...new Set(ids.filter(Boolean))];
    if (!cleanIds.length) return new Map();
    const { data, error } = await state.client.from("profiles").select(profileColumns()).in("id", cleanIds);
    if (error) return new Map();
    return new Map((data || []).map((profile) => [profile.id, profile]));
  }

  async function countRows(table, filters) {
    let query = state.client.from(table).select("*", { count: "exact", head: true });
    filters.forEach(([method, column, value]) => {
      query = query[method](column, value);
    });
    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  }

  async function enrichPosts(posts) {
    if (!posts.length) return [];
    const ids = posts.map((post) => post.id);
    const authorIds = posts.map((post) => post.author_id);
    const [profiles, likes, comments, viewerLikes] = await Promise.all([
      fetchProfiles(authorIds),
      state.client.from("post_likes").select("post_id").in("post_id", ids),
      state.client.from("comments").select("post_id").in("post_id", ids),
      state.client.from("post_likes").select("post_id").eq("user_id", state.user.id).in("post_id", ids)
    ]);
    const likeCounts = new Map();
    const commentCounts = new Map();
    (likes.data || []).forEach((row) => likeCounts.set(row.post_id, (likeCounts.get(row.post_id) || 0) + 1));
    (comments.data || []).forEach((row) => commentCounts.set(row.post_id, (commentCounts.get(row.post_id) || 0) + 1));
    const liked = new Set((viewerLikes.data || []).map((row) => row.post_id));
    return posts.map((post) => ({
      ...post,
      author: profiles.get(post.author_id) || { id: post.author_id, display_name: "LC App user" },
      likeCount: likeCounts.get(post.id) || 0,
      commentCount: commentCounts.get(post.id) || 0,
      viewerHasLiked: liked.has(post.id)
    }));
  }

  function setChrome() {
    q("#screen")?.classList.add("lc-social-active");
    const appTop = q("#appTop");
    if (appTop && q("#accountPage")?.getAttribute("aria-hidden") !== "false") {
      appTop.innerHTML = `
        <div class="account-topbar">
          <div class="account-top-copy">
            <span class="account-avatar"><img src="${safe(avatar(state.profile))}" alt="Profile avatar" /></span>
            <div class="account-top-meta">
              <span>Social MVP</span>
              <strong>${safe(displayName(state.profile))}</strong>
              <p>${safe(username(state.profile))}</p>
            </div>
          </div>
          <span class="lc-social-badge">Real Supabase</span>
        </div>
      `;
    }
    const tabs = q(".tabs");
    if (tabs) {
      tabs.innerHTML = ["following", "explore", "mine", "notifications"].map((tab) => `
        <button class="lc-social-tab ${state.tab === tab ? "active" : ""}" type="button" data-lc-social-tab="${tab}">
          ${tab === "following" ? "Following" : tab === "explore" ? "Explore" : tab === "mine" ? "My posts" : `Notifications${state.notificationCount ? ` · ${state.notificationCount}` : ""}`}
        </button>
      `).join("");
    }
    const signal = q("#signalStrip");
    if (signal) signal.innerHTML = "<b>Social MVP</b><span>Real posts, follows, comments and notifications</span>";
    const dock = q(".feed-quick-dock");
    if (dock) {
      dock.innerHTML = `
        <button class="icon-btn" type="button" data-lc-social-tab="explore" aria-label="Explore">⌕</button>
        <button class="icon-btn" type="button" data-lc-social-tab="following" aria-label="Feed">⌂</button>
        <button class="icon-btn" type="button" data-lc-social-tab="notifications" aria-label="Notifications">${state.notificationCount ? "●" : "!"}</button>
      `;
    }
  }

  function root() {
    return q("#feed");
  }

  function renderShell(body = "") {
    setChrome();
    const feed = root();
    if (!feed) return;
    feed.innerHTML = `<div class="lc-social-feed" data-lc-social-root>${body}</div>`;
  }

  function composer() {
    return `
      <section class="lc-social-card lc-social-pad">
        <div class="lc-social-top">
          <img src="${safe(avatar(state.profile))}" alt="Your avatar">
          <div><strong>${safe(displayName(state.profile))}</strong><span>${safe(username(state.profile))}</span></div>
        </div>
        <form class="lc-social-form" data-lc-social-form="post">
          <textarea class="lc-social-textarea" name="body" maxlength="2000" placeholder="Share a Live Casino thought..."></textarea>
          <div class="lc-social-actions">
            <button class="lc-social-btn primary" type="submit">Post</button>
            <span class="lc-social-muted">Text-only for P1. Media is preview-only.</span>
          </div>
        </form>
      </section>
    `;
  }

  function renderFeed() {
    if (state.loading && !state.posts.length) {
      renderShell(`${composer()}<div class="lc-social-skeleton"></div><div class="lc-social-skeleton"></div>`);
      return;
    }
    const posts = state.posts.map(postMarkup).join("");
    const failure = !state.loading && state.error ? `
      <section class="lc-social-card lc-social-empty">
        <h3>Couldn't load the feed.</h3>
        <p>Check your connection and try again.</p>
        <button class="lc-social-btn primary" type="button" data-lc-social-action="retry-feed">Retry</button>
      </section>
    ` : "";
    const empty = !state.loading && !state.error && !state.posts.length ? `
      <section class="lc-social-card lc-social-empty">
        <h3>${state.tab === "following" ? "Your feed is empty" : "No posts yet"}</h3>
        <p>${state.tab === "following" ? "Follow creators, players, and hosts to see their latest updates here." : "Create the first real LC App post."}</p>
        <button class="lc-social-btn primary" type="button" data-lc-social-tab="explore">Explore community</button>
      </section>
    ` : "";
    const more = state.hasMore && state.posts.length ? `<button class="lc-social-btn" type="button" data-lc-social-action="load-more">Load more</button>` : "";
    renderShell(`${composer()}${posts}${failure}${empty}${more}`);
  }

  function postMarkup(post) {
    const author = post.author || {};
    const own = post.author_id === state.user.id;
    const liked = post.viewerHasLiked;
    return `
      <article class="lc-social-card lc-social-pad" data-post-id="${safe(post.id)}">
        <div class="lc-social-top">
          <img src="${safe(avatar(author))}" alt="${safe(displayName(author))}">
          <div>
            <strong>${safe(displayName(author))}</strong>
            <span>${safe(username(author))} · ${safe(relTime(post.created_at))}</span>
          </div>
          <div class="lc-social-spacer"></div>
          ${own ? `<button class="lc-social-btn" type="button" data-lc-social-action="delete-post" data-post-id="${safe(post.id)}">Delete</button>` : `<button class="lc-social-btn danger" type="button" data-lc-social-report="post" data-target-id="${safe(post.id)}">Report</button>`}
        </div>
        <div class="lc-social-body">${safe(post.deleted_at ? "[deleted]" : post.body)}</div>
        <div class="lc-social-actions">
          <button class="lc-social-btn ${liked ? "active" : ""}" type="button" data-lc-social-action="like" data-post-id="${safe(post.id)}">${liked ? "Liked" : "Like"} · ${post.likeCount}</button>
          <button class="lc-social-btn" type="button" data-lc-social-action="comments" data-post-id="${safe(post.id)}">Comments · ${post.commentCount}</button>
          ${!own ? `<button class="lc-social-btn danger" type="button" data-lc-social-action="block" data-user-id="${safe(post.author_id)}" data-username="${safe(author.username || "user")}">Block</button>` : ""}
        </div>
        ${state.commentsByPost.has(post.id) ? commentsMarkup(post.id) : ""}
      </article>
    `;
  }

  function commentsMarkup(postId) {
    const comments = state.commentsByPost.get(postId) || [];
    const topLevel = comments.filter((comment) => !comment.parent_comment_id);
    const replies = new Map();
    comments.filter((comment) => comment.parent_comment_id).forEach((comment) => {
      if (!replies.has(comment.parent_comment_id)) replies.set(comment.parent_comment_id, []);
      replies.get(comment.parent_comment_id).push(comment);
    });
    const list = topLevel.length ? topLevel.map((comment) => `
      ${commentMarkup(comment, false)}
      ${(replies.get(comment.id) || []).map((reply) => commentMarkup(reply, true)).join("")}
    `).join("") : `<div class="lc-social-muted">No comments yet. Start the conversation.</div>`;
    return `
      <div class="lc-comments">
        ${list}
        <form class="lc-social-form" data-lc-social-form="comment" data-post-id="${safe(postId)}">
          <input class="lc-social-input" name="body" maxlength="1000" placeholder="Add a comment">
          <button class="lc-social-btn primary" type="submit">Comment</button>
        </form>
      </div>
    `;
  }

  function commentMarkup(comment, reply) {
    const author = comment.author || {};
    const own = comment.author_id === state.user.id;
    return `
      <div class="lc-comment ${reply ? "reply" : ""}" data-comment-id="${safe(comment.id)}">
        <div class="lc-comment-head">
          <img src="${safe(avatar(author))}" alt="${safe(displayName(author))}">
          <div><strong>${safe(displayName(author))}</strong><span class="lc-social-muted">${safe(relTime(comment.created_at))}</span></div>
        </div>
        <p>${safe(comment.deleted_at ? "[deleted]" : comment.body)}</p>
        <div class="lc-social-actions">
          ${!reply && !comment.deleted_at ? `<button class="lc-social-btn" type="button" data-lc-social-action="reply" data-post-id="${safe(comment.post_id)}" data-comment-id="${safe(comment.id)}">Reply</button>` : ""}
          ${own && !comment.deleted_at ? `<button class="lc-social-btn" type="button" data-lc-social-action="delete-comment" data-post-id="${safe(comment.post_id)}" data-comment-id="${safe(comment.id)}">Delete</button>` : ""}
          ${!own ? `<button class="lc-social-btn danger" type="button" data-lc-social-report="comment" data-target-id="${safe(comment.id)}">Report</button>` : ""}
        </div>
      </div>
    `;
  }

  async function loadFeed(reset = false) {
    if (state.loading) return;
    state.loading = true;
    state.error = "";
    if (reset) {
      state.cursor = null;
      state.hasMore = true;
    }
    renderFeed();
    try {
      let query = state.client.from("posts")
        .select("id,author_id,body,media_url,status,created_at,updated_at,deleted_at")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);
      if (state.tab === "mine") query = query.eq("author_id", state.user.id);
      if (state.tab === "following") {
        const ids = [...state.followingIds];
        if (!ids.length) {
          state.loading = false;
          renderFeed();
          return;
        }
        query = query.in("author_id", ids);
      }
      if (state.cursor) {
        query = query.or(`created_at.lt.${state.cursor.created_at},and(created_at.eq.${state.cursor.created_at},id.lt.${state.cursor.id})`);
      }
      const { data, error } = await query;
      if (error) throw error;
      const enriched = await enrichPosts(data || []);
      state.posts = reset ? enriched : state.posts.concat(enriched);
      state.hasMore = (data || []).length === PAGE_SIZE;
      state.cursor = state.posts.length ? state.posts[state.posts.length - 1] : null;
    } catch (error) {
      state.error = "Couldn't load the feed.";
      toast(state.error);
    } finally {
      state.loading = false;
      renderFeed();
    }
  }

  async function createPost(form) {
    const body = String(new FormData(form).get("body") || "").trim();
    if (!body) return;
    const button = form.querySelector("button");
    if (button) button.disabled = true;
    try {
      const { data, error } = await state.client.from("posts")
        .insert({ author_id: state.user.id, body, status: "active" })
        .select("id,author_id,body,media_url,status,created_at,updated_at,deleted_at")
        .single();
      if (error) throw error;
      const [post] = await enrichPosts([data]);
      state.posts.unshift(post);
      form.reset();
      renderFeed();
    } catch (error) {
      toast(message(error));
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function toggleLike(postId) {
    const post = state.posts.find((item) => item.id === postId);
    if (!post) return;
    const wasLiked = post.viewerHasLiked;
    post.viewerHasLiked = !wasLiked;
    post.likeCount += wasLiked ? -1 : 1;
    renderFeed();
    try {
      if (wasLiked) {
        const { error } = await state.client.from("post_likes").delete().eq("post_id", postId).eq("user_id", state.user.id);
        if (error) throw error;
      } else {
        const { error } = await state.client.from("post_likes").insert({ post_id: postId, user_id: state.user.id });
        if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
      }
    } catch (error) {
      post.viewerHasLiked = wasLiked;
      post.likeCount += wasLiked ? 1 : -1;
      renderFeed();
      toast(message(error));
    }
  }

  async function loadComments(postId) {
    if (state.commentsByPost.has(postId)) {
      state.commentsByPost.delete(postId);
      renderFeed();
      return;
    }
    try {
      const { data, error } = await state.client.from("comments")
        .select("id,post_id,author_id,parent_comment_id,body,status,created_at,updated_at,deleted_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const profiles = await fetchProfiles((data || []).map((comment) => comment.author_id));
      state.commentsByPost.set(postId, (data || []).map((comment) => ({ ...comment, author: profiles.get(comment.author_id) })));
      renderFeed();
    } catch (error) {
      toast(message(error));
    }
  }

  async function createComment(form) {
    const formData = new FormData(form);
    const body = String(formData.get("body") || "").trim();
    const postId = form.dataset.postId;
    const parentId = form.dataset.parentCommentId || null;
    if (!body || !postId) return;
    try {
      const { error } = await state.client.from("comments").insert({
        post_id: postId,
        author_id: state.user.id,
        parent_comment_id: parentId,
        body,
        status: "active"
      });
      if (error) throw error;
      state.commentsByPost.delete(postId);
      await loadComments(postId);
    } catch (error) {
      toast(message(error));
    }
  }

  function renderReplyForm(postId, commentId) {
    const holder = q(`[data-comment-id="${CSS.escape(commentId)}"]`);
    if (!holder || q("[data-lc-reply-form]", holder)) return;
    holder.insertAdjacentHTML("beforeend", `
      <form class="lc-social-form" data-lc-social-form="comment" data-lc-reply-form data-post-id="${safe(postId)}" data-parent-comment-id="${safe(commentId)}">
        <input class="lc-social-input" name="body" maxlength="1000" placeholder="Write a reply">
        <button class="lc-social-btn primary" type="submit">Reply</button>
      </form>
    `);
  }

  async function softDeletePost(postId) {
    try {
      const { error } = await state.client.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId);
      if (error) throw error;
      state.posts = state.posts.filter((post) => post.id !== postId);
      renderFeed();
    } catch (error) {
      toast(message(error));
    }
  }

  async function softDeleteComment(postId, commentId) {
    try {
      const { error } = await state.client.from("comments").update({ deleted_at: new Date().toISOString(), body: "[deleted]" }).eq("id", commentId);
      if (error) throw error;
      state.commentsByPost.delete(postId);
      await loadComments(postId);
    } catch (error) {
      toast(message(error));
    }
  }

  async function followProfile(profileId) {
    if (profileId === state.user.id) return;
    const following = state.followingIds.has(profileId);
    if (following) state.followingIds.delete(profileId);
    else state.followingIds.add(profileId);
    if (state.tab === "explore") renderExplore();
    else renderFeed();
    try {
      if (following) {
        const { error } = await state.client.from("follows").delete().eq("follower_id", state.user.id).eq("following_id", profileId);
        if (error) throw error;
      } else {
        const { error } = await state.client.from("follows").insert({ follower_id: state.user.id, following_id: profileId });
        if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
      }
    } catch (error) {
      if (following) state.followingIds.add(profileId);
      else state.followingIds.delete(profileId);
      toast(message(error));
      if (state.tab === "explore") renderExplore();
      else renderFeed();
    }
  }

  async function blockProfile(profileId, usernameValue = "user") {
    if (profileId === state.user.id) return;
    const ok = window.confirm(`Block ${usernameValue}?\n\nThey will no longer be able to follow you, view your posts, or interact with you. Existing follows in both directions will be removed.`);
    if (!ok) return;
    try {
      const { error } = await state.client.from("user_blocks").insert({ blocker_id: state.user.id, blocked_id: profileId });
      if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
      state.blockedIds.add(profileId);
      state.followingIds.delete(profileId);
      state.posts = state.posts.filter((post) => post.author_id !== profileId);
      state.commentsByPost.clear();
      toast("User blocked");
      if (state.tab === "explore") renderExplore();
      else renderFeed();
    } catch (error) {
      toast(message(error));
    }
  }

  async function unblockProfile(profileId) {
    try {
      const { error } = await state.client.from("user_blocks").delete().eq("blocker_id", state.user.id).eq("blocked_id", profileId);
      if (error) throw error;
      state.blockedIds.delete(profileId);
      await renderBlocked();
    } catch (error) {
      toast(message(error));
    }
  }

  function renderExplore() {
    setChrome();
    const body = `
      <section class="lc-social-card lc-social-pad lc-social-search">
        <strong>Explore community</strong>
        <input class="lc-social-input" data-lc-social-search placeholder="Search username or display name" autocomplete="off">
        <span class="lc-social-muted">Minimum 2 characters. Results are filtered by available account rows and your block list where available.</span>
      </section>
      <section class="lc-social-card" data-lc-social-results>
        ${state.searchResults.length ? state.searchResults.map(profileRow).join("") : `<div class="lc-social-empty"><h3>Search community</h3><p>Find creators, players, and hosts by username or display name.</p></div>`}
      </section>
      <section class="lc-social-card lc-social-pad">
        <button class="lc-social-btn" type="button" data-lc-social-action="blocked-list">Blocked users</button>
      </section>
    `;
    renderShell(body);
  }

  function profileRow(profile) {
    const own = profile.id === state.user.id;
    const following = state.followingIds.has(profile.id);
    const blocked = state.blockedIds.has(profile.id);
    return `
      <div class="lc-social-row" data-profile-id="${safe(profile.id)}">
        <img src="${safe(avatar(profile))}" alt="${safe(displayName(profile))}">
        <div class="lc-social-row-main">
          <strong>${safe(displayName(profile))}</strong>
          <span>${safe(username(profile))}${profile.bio ? ` · ${safe(profile.bio)}` : ""}</span>
        </div>
        ${own ? `<span class="lc-social-badge">You</span>` : `
          <button class="lc-social-btn" type="button" data-lc-social-action="profile" data-user-id="${safe(profile.id)}">View</button>
          <button class="lc-social-btn ${following ? "active" : ""}" type="button" data-lc-social-action="follow" data-user-id="${safe(profile.id)}">${following ? "Following" : "Follow"}</button>
          <button class="lc-social-btn danger" type="button" data-lc-social-action="block" data-user-id="${safe(profile.id)}" data-username="${safe(profile.username || "user")}">${blocked ? "Blocked" : "Block"}</button>
        `}
      </div>
    `;
  }

  async function renderPublicProfile(profileId) {
    if (!profileId) return;
    if (profileId === state.user.id) {
      await changeTab("mine");
      return;
    }
    setChrome();
    renderShell(`<div class="lc-social-skeleton"></div><div class="lc-social-skeleton"></div>`);
    try {
      const { data: profile, error } = await state.client.from("profiles")
        .select(profileColumns())
        .eq("id", profileId)
        .eq("account_status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!profile || state.blockedIds.has(profile.id)) {
        renderShell(`<section class="lc-social-card lc-social-empty"><h3>Profile unavailable</h3><p>This profile is unavailable.</p><button class="lc-social-btn primary" type="button" data-lc-social-tab="explore">Back to Explore</button></section>`);
        return;
      }
      const [followers, following, postsResult] = await Promise.all([
        countRows("follows", [["eq", "following_id", profile.id]]),
        countRows("follows", [["eq", "follower_id", profile.id]]),
        state.client.from("posts")
          .select("id,author_id,body,media_url,status,created_at,updated_at,deleted_at")
          .eq("author_id", profile.id)
          .eq("status", "active")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(5)
      ]);
      if (postsResult.error) throw postsResult.error;
      const posts = await enrichPosts(postsResult.data || []);
      const isFollowing = state.followingIds.has(profile.id);
      renderShell(`
        <section class="lc-social-card lc-social-pad">
          <div class="lc-social-top">
            <img src="${safe(avatar(profile))}" alt="${safe(displayName(profile))}">
            <div><strong>${safe(displayName(profile))}</strong><span>${safe(username(profile))}${profile.country ? ` · ${safe(profile.country)}` : ""}</span></div>
          </div>
          <p class="lc-social-body">${safe(profile.bio || "LC App community profile.")}</p>
          <div class="lc-social-counts">
            <div class="lc-social-count"><strong>${followers}</strong><span>Followers</span></div>
            <div class="lc-social-count"><strong>${following}</strong><span>Following</span></div>
          </div>
          <div class="lc-social-actions">
            <button class="lc-social-btn ${isFollowing ? "active" : ""}" type="button" data-lc-social-action="follow" data-user-id="${safe(profile.id)}">${isFollowing ? "Following" : "Follow"}</button>
            <button class="lc-social-btn danger" type="button" data-lc-social-action="block" data-user-id="${safe(profile.id)}" data-username="${safe(profile.username || "user")}">Block</button>
            <button class="lc-social-btn danger" type="button" data-lc-social-report="profile" data-target-id="${safe(profile.id)}">Report</button>
            <button class="lc-social-btn" type="button" data-lc-social-tab="explore">Back</button>
          </div>
        </section>
        ${posts.length ? posts.map(postMarkup).join("") : `<section class="lc-social-card lc-social-empty"><h3>No posts yet</h3><p>Recent public posts from this profile will appear here.</p></section>`}
      `);
    } catch (error) {
      toast(message(error));
      renderShell(`<section class="lc-social-card lc-social-empty"><h3>Profile unavailable</h3><p>Try again in a moment.</p><button class="lc-social-btn primary" type="button" data-lc-social-tab="explore">Back to Explore</button></section>`);
    }
  }

  async function searchProfiles(term) {
    const value = String(term || "").trim();
    if (value.length < SEARCH_MIN) {
      state.searchResults = [];
      renderExplore();
      return;
    }
    try {
      const escaped = value.replace(/[^A-Za-z0-9_ -]/g, "").trim();
      if (escaped.length < SEARCH_MIN) {
        state.searchResults = [];
        renderExplore();
        return;
      }
      const { data, error } = await state.client.from("profiles")
        .select(profileColumns())
        .eq("account_status", "active")
        .or(`username.ilike.${escaped}%,display_name.ilike.%${escaped}%`)
        .limit(20);
      if (error) throw error;
      state.searchResults = (data || []).filter((profile) => !state.blockedIds.has(profile.id));
      state.searchResults.sort((a, b) => {
        const au = String(a.username || "").toLowerCase().startsWith(value.toLowerCase()) ? 0 : 1;
        const bu = String(b.username || "").toLowerCase().startsWith(value.toLowerCase()) ? 0 : 1;
        return au - bu || String(a.username || "").localeCompare(String(b.username || ""));
      });
    } catch (error) {
      state.searchResults = [];
      toast(message(error));
    }
    renderExplore();
    const input = q("[data-lc-social-search]");
    if (input) {
      input.value = value;
      input.focus();
    }
  }

  async function renderNotifications() {
    setChrome();
    renderShell(`<div class="lc-social-skeleton"></div><div class="lc-social-skeleton"></div>`);
    try {
      const { data, error } = await state.client.from("notifications")
        .select("id,actor_id,type,target_type,target_id,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const profiles = await fetchProfiles((data || []).map((item) => item.actor_id));
      const rows = (data || []).map((item) => {
        const actor = profiles.get(item.actor_id) || {};
        const label = item.type === "new_follower" ? "followed you" : item.type === "post_like" ? "liked your post" : item.type === "comment_reply" ? "replied to your comment" : "commented on your post";
        return `
          <div class="lc-social-row">
            <img src="${safe(avatar(actor))}" alt="${safe(displayName(actor))}">
            <div class="lc-social-row-main"><strong>${safe(displayName(actor))}</strong><span>${safe(label)} · ${safe(relTime(item.created_at))}</span></div>
            ${item.read_at ? "" : `<button class="lc-social-btn" type="button" data-lc-social-action="read-notification" data-notification-id="${safe(item.id)}">Read</button>`}
          </div>
        `;
      }).join("");
      renderShell(`
        <section class="lc-social-card lc-social-pad">
          <div class="lc-social-top"><strong>Notifications</strong><div class="lc-social-spacer"></div><button class="lc-social-btn" type="button" data-lc-social-action="read-all">Mark all read</button></div>
        </section>
        <section class="lc-social-card">${rows || `<div class="lc-social-empty"><h3>All caught up</h3><p>When someone follows you, likes your post, or comments, you'll see it here.</p></div>`}</section>
      `);
    } catch (error) {
      toast(message(error));
      renderShell(`<section class="lc-social-card lc-social-empty"><h3>Notifications unavailable</h3><p>Try again in a moment.</p></section>`);
    }
  }

  async function refreshUnreadCount() {
    if (!state.client || !state.user) return;
    const { count } = await state.client.from("notifications").select("*", { count: "exact", head: true }).is("read_at", null);
    state.notificationCount = count || 0;
  }

  async function markNotification(id) {
    const { error } = await state.client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) toast(message(error));
    await refreshUnreadCount();
    await renderNotifications();
  }

  async function markAllNotifications() {
    const { error } = await state.client.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (error) toast(message(error));
    await refreshUnreadCount();
    await renderNotifications();
  }

  async function renderBlocked() {
    setChrome();
    renderShell(`<div class="lc-social-skeleton"></div>`);
    const { data, error } = await state.client.from("user_blocks").select("blocked_id").eq("blocker_id", state.user.id);
    if (error) {
      toast(message(error));
      renderExplore();
      return;
    }
    const profiles = await fetchProfiles((data || []).map((row) => row.blocked_id));
    const rows = (data || []).map((row) => {
      const profile = profiles.get(row.blocked_id) || { id: row.blocked_id, display_name: "Blocked user" };
      return `
        <div class="lc-social-row">
          <img src="${safe(avatar(profile))}" alt="${safe(displayName(profile))}">
          <div class="lc-social-row-main"><strong>${safe(displayName(profile))}</strong><span>${safe(username(profile))}</span></div>
          <button class="lc-social-btn" type="button" data-lc-social-action="unblock" data-user-id="${safe(row.blocked_id)}">Unblock</button>
        </div>
      `;
    }).join("");
    renderShell(`
      <section class="lc-social-card lc-social-pad"><div class="lc-social-top"><strong>Blocked users</strong><div class="lc-social-spacer"></div><button class="lc-social-btn" type="button" data-lc-social-tab="explore">Back</button></div></section>
      <section class="lc-social-card">${rows || `<div class="lc-social-empty"><h3>No blocked users</h3><p>Blocked accounts will appear here.</p></div>`}</section>
    `);
  }

  function openReport(targetType, targetId) {
    let sheet = q("#lcSocialSheet");
    if (!sheet) {
      sheet = document.createElement("section");
      sheet.id = "lcSocialSheet";
      sheet.className = "lc-social-sheet";
      q("#screen")?.appendChild(sheet);
    }
    sheet.hidden = false;
    sheet.innerHTML = `
      <div class="lc-social-sheet-head"><strong>Report ${safe(targetType)}</strong><button class="lc-social-btn" type="button" data-lc-social-action="close-sheet">Close</button></div>
      <form class="lc-social-form" data-lc-social-form="report" data-target-type="${safe(targetType)}" data-target-id="${safe(targetId)}">
        <select class="lc-social-select" name="reason">${REPORT_REASONS.map(([value, label]) => `<option value="${safe(value)}">${safe(label)}</option>`).join("")}</select>
        <textarea class="lc-social-textarea" name="description" maxlength="500" placeholder="Optional context"></textarea>
        <p class="lc-social-muted">Your report will be reviewed privately.</p>
        <button class="lc-social-btn primary" type="submit">Submit report</button>
      </form>
    `;
  }

  async function submitReport(form) {
    const formData = new FormData(form);
    const payload = {
      reporter_id: state.user.id,
      target_type: form.dataset.targetType,
      target_id: form.dataset.targetId,
      reason: String(formData.get("reason") || "other"),
      description: String(formData.get("description") || "").trim() || null
    };
    try {
      const { error } = await state.client.from("reports").insert(payload);
      if (error && !/23505|duplicate/i.test(`${error.code} ${error.message}`)) throw error;
      q("#lcSocialSheet")?.setAttribute("hidden", "");
      toast("Thanks for reporting. We'll look into it.");
    } catch (error) {
      toast(message(error));
    }
  }

  async function renderProfileSummary() {
    const [followers, following] = await Promise.all([
      countRows("follows", [["eq", "following_id", state.profile.id]]),
      countRows("follows", [["eq", "follower_id", state.profile.id]])
    ]);
    return `
      <section class="lc-social-card lc-social-pad">
        <div class="lc-social-top">
          <img src="${safe(avatar(state.profile))}" alt="Your avatar">
          <div><strong>${safe(displayName(state.profile))}</strong><span>${safe(username(state.profile))}</span></div>
        </div>
        <div class="lc-social-counts">
          <div class="lc-social-count"><strong>${followers}</strong><span>Followers</span></div>
          <div class="lc-social-count"><strong>${following}</strong><span>Following</span></div>
        </div>
      </section>
    `;
  }

  async function changeTab(tab) {
    state.tab = tab;
    state.commentsByPost.clear();
    if (tab === "explore") {
      renderExplore();
      return;
    }
    if (tab === "notifications") {
      await renderNotifications();
      return;
    }
    await loadFeed(true);
    if (tab === "mine") {
      const feed = q("[data-lc-social-root]");
      if (feed) feed.insertAdjacentHTML("afterbegin", await renderProfileSummary());
    }
  }

  function bindEvents() {
    if (window.__lcSocialEventsBound) return;
    window.__lcSocialEventsBound = true;
    document.addEventListener("input", (event) => {
      const search = event.target.closest("[data-lc-social-search]");
      if (!search) return;
      window.clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(() => searchProfiles(search.value), SEARCH_DELAY);
    }, true);
    document.addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-lc-social-form]");
      if (!form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (form.dataset.lcSocialForm === "post") await createPost(form);
      if (form.dataset.lcSocialForm === "comment") await createComment(form);
      if (form.dataset.lcSocialForm === "report") await submitReport(form);
    }, true);
    document.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-lc-social-tab],[data-lc-social-action],[data-lc-social-report]");
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const tab = target.dataset.lcSocialTab;
      if (tab) {
        await changeTab(tab);
        return;
      }
      const reportType = target.dataset.lcSocialReport;
      if (reportType) {
        openReport(reportType, target.dataset.targetId);
        return;
      }
      const action = target.dataset.lcSocialAction;
      if (action === "load-more") await loadFeed(false);
      if (action === "retry-feed") await loadFeed(!state.posts.length);
      if (action === "like") await toggleLike(target.dataset.postId);
      if (action === "comments") await loadComments(target.dataset.postId);
      if (action === "reply") renderReplyForm(target.dataset.postId, target.dataset.commentId);
      if (action === "delete-post") await softDeletePost(target.dataset.postId);
      if (action === "delete-comment") await softDeleteComment(target.dataset.postId, target.dataset.commentId);
      if (action === "profile") await renderPublicProfile(target.dataset.userId);
      if (action === "follow") await followProfile(target.dataset.userId);
      if (action === "block") await blockProfile(target.dataset.userId, target.dataset.username || "user");
      if (action === "blocked-list") await renderBlocked();
      if (action === "unblock") await unblockProfile(target.dataset.userId);
      if (action === "read-notification") await markNotification(target.dataset.notificationId);
      if (action === "read-all") await markAllNotifications();
      if (action === "close-sheet") q("#lcSocialSheet")?.setAttribute("hidden", "");
    }, true);
  }

  async function mount({ client, profile }) {
    if (!client || !profile) return;
    injectStyles();
    bindEvents();
    state.client = client;
    state.profile = profile;
    try {
      state.user = await ownUser();
      await refreshRelations();
      await refreshUnreadCount();
      state.mounted = true;
      await changeTab(state.tab || "following");
    } catch (error) {
      toast(message(error));
    }
  }

  function clear() {
    state.client = null;
    state.user = null;
    state.profile = null;
    state.mounted = false;
    state.posts = [];
    state.error = "";
    state.commentsByPost.clear();
    q("#screen")?.classList.remove("lc-social-active");
    q("#lcSocialSheet")?.setAttribute("hidden", "");
  }

  window.LCAppSocial = { mount, clear };
})();
