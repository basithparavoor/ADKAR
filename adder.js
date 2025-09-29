// ------------------------
// PASSWORD / LOGIN LOGIC
// ------------------------
// Change the password below as needed:
const PASSWORD = "12345"; // <-- Replace with your desired password

const loginScreen = document.getElementById("loginScreen");
const mainContent = document.getElementById("mainContent");
const loginBtn = document.getElementById("loginBtn");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");

// If a successful login flag exists in sessionStorage, skip login
if (sessionStorage.getItem('article_adder_logged_in') === '1') {
  loginScreen.classList.add('hidden');
  mainContent.classList.remove('hidden');
}

// allow Enter key on password input
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loginBtn.click();
  }
});

loginBtn.addEventListener("click", () => {
  const val = passwordInput.value || '';
  if (val === PASSWORD) {
    loginError.classList.add('hidden');
    sessionStorage.setItem('article_adder_logged_in', '1');
    loginScreen.classList.add("hidden");
    mainContent.classList.remove("hidden");
    // focus first input
    const t = document.getElementById('title');
    if (t) t.focus();
  } else {
    loginError.classList.remove("hidden");
    passwordInput.value = '';
    passwordInput.focus();
  }
});

// ------------------------
// ARTICLE ADDER APP CODE
// ------------------------

// Initialize Quill editor
const quill = new Quill('#editor', {
  theme: 'snow',
  placeholder: 'Write your article here...',
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered'}, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  }
});

// Base article template (article.html)
const articleTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{title}}</title>
  <meta name="description" content="{{meta}}">
  <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body class="bg-white text-gray-900">
  <main class="max-w-3xl mx-auto p-6">
    <header class="mb-6">
      <h1 class="text-3xl font-bold">{{title}}</h1>
      <div class="mt-2 text-sm text-gray-600">By <strong>{{author}}</strong> · <time>{{date}}</time> · {{readingTime}} min read</div>
      <div class="mt-4 text-sm text-gray-500">Category: {{tags}}</div>
      <div class="mt-6">
        <img src="{{imageUrl}}" alt="featured image" style="max-width:100%;border-radius:8px;">
      </div>
    </header>

    <article class="prose max-w-none">
      {{content}}
    </article>
  </main>
</body>
</html>`;

// helpers
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^a-z0-9\-]/g, '')    // Remove all non-alphanumeric and -
    .replace(/-+/g, '-')             // Replace multiple - with single -
    .replace(/^-+|-+$/g, '');        // Trim - from start/end
}

function safeFilename(title){
  let s = slugify(title);
  if(!s) s = 'article';
  return s + '.html';
}

// DOM elements
const titleEl = document.getElementById('title');
const authorEl = document.getElementById('author');
const dateEl = document.getElementById('date');
const readingEl = document.getElementById('readingTime');
const imgEl = document.getElementById('imageUrl');
const tagsEl = document.getElementById('tags');
const slugDisplay = document.getElementById('slugDisplay');
const previewFrame = document.getElementById('previewFrame');
const snippetBox = document.getElementById('snippetBox');
const metaDisplay = document.getElementById('metaDisplay');
const sessionList = document.getElementById('sessionList');

const previewSection = document.getElementById('previewSection');
const snippetSection = document.getElementById('snippetSection');

const downloadBtn = document.getElementById('downloadBtn');
const openBtn = document.getElementById('openBtn');
const copySnippetBtn = document.getElementById('copySnippetBtn');
const previewSnippetBtn = document.getElementById('previewSnippetBtn');

// auto-fill date to today
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth()+1).padStart(2,'0');
const dd = String(today.getDate()).padStart(2, '0');
dateEl.value = `${yyyy}-${mm}-${dd}`;

// update slug live
titleEl.addEventListener('input', ()=>{
  const slug = safeFilename(titleEl.value || 'article');
  slugDisplay.textContent = slug;
});

// generate meta description from content (first 150 chars)
function generateMeta(html){
  // take text content only and trim
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let txt = tmp.textContent || tmp.innerText || '';
  txt = txt.trim().replace(/\s+/g,' ');
  return txt.slice(0,150);
}

document.getElementById('copyMetaBtn').addEventListener('click', ()=>{
  const html = quill.root.innerHTML;
  const meta = generateMeta(html);
  navigator.clipboard.writeText(meta).then(()=>{
    alert('Meta description copied to clipboard');
  });
});

// produce article HTML by replacing placeholders
function buildArticleHtml(data){
  let html = articleTemplate
    .replace(/{{title}}/g, escapeHtml(data.title))
    .replace(/{{author}}/g, escapeHtml(data.author))
    .replace(/{{date}}/g, escapeHtml(data.date))
    .replace(/{{readingTime}}/g, escapeHtml(data.readingTime))
    .replace(/{{imageUrl}}/g, escapeHtml(data.imageUrl || ''))
    .replace(/{{tags}}/g, escapeHtml(data.tags || ''))
    .replace(/{{meta}}/g, escapeHtml(data.meta || ''))
    .replace(/{{content}}/g, data.content || '');
  return html;
}

// simple escape for meta & title only (we don't escape content because it's HTML)
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// extract first paragraph text for excerpt
function firstParagraph(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const p = tmp.querySelector('p');
  if(p){
    return p.textContent.trim();
  }
  // fallback: textContent shortened
  const txt = tmp.textContent || '';
  return txt.trim().split('\n').map(s=>s.trim()).filter(Boolean)[0] || '';
}

// build blog card snippet (HTML) ready to paste into blog.html posts list
function buildBlogSnippet(data, filename){
  const excerpt = escapeHtml(firstParagraph(data.content)).slice(0,200);
  const img = data.imageUrl ? `<img src="${data.imageUrl}" alt="thumb" class="w-28 h-20 object-cover rounded">` : '';
  const dateStr = data.date || '';
  const category = data.tags ? `<span class="text-xs font-semibold text-indigo-600">${escapeHtml(data.tags.split(',')[0] || '')}</span>` : '';

  const snippet = `<!-- Blog card: ${escapeHtml(data.title)} -->\n<div class=\"post-card flex gap-4 items-start\">\n  ${img}\n  <div>\n    <div class=\"meta text-xs text-gray-500\">${category} · ${dateStr} · ${escapeHtml(data.readingTime)} min read</div>\n    <h3 class=\"mt-1 text-lg font-semibold\"><a href=\"${filename}\">${escapeHtml(data.title)}</a></h3>\n    <p class=\"mt-1 text-sm text-gray-700\">${excerpt}...</p>\n    <a class=\"mt-2 inline-block text-indigo-600 text-sm\" href=\"${filename}\">Read →</a>\n  </div>\n</div>\n`;
  return snippet;
}

// show preview by creating a blob URL and setting iframe src
function showPreview(html){
  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  previewFrame.src = url;
}

// download file
function downloadFile(filename, content){
  const blob = new Blob([content], {type: 'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// store session articles in-memory
const sessionArticles = [];

function addToSession(data){
  sessionArticles.push(data);
  renderSessionList();
}

function renderSessionList(){
  sessionList.innerHTML = '';
  sessionArticles.forEach((a, idx)=>{
    const li = document.createElement('li');
    li.className = 'p-2 border rounded flex items-center justify-between';
    li.innerHTML = `<div class="text-sm"><strong>${escapeHtml(a.title)}</strong><div class="text-xs text-gray-500">${a.date} · ${a.readingTime} min</div></div><div class="flex gap-2"><button data-idx="${idx}" class="download btn px-2 py-1 border rounded text-sm">Download</button><button data-idx="${idx}" class="open btn px-2 py-1 border rounded text-sm">Open</button></div>`;
    sessionList.appendChild(li);
  });

  // attach handlers
  document.querySelectorAll('.download').forEach(btn=>{
    btn.onclick = (e)=>{
      const idx = e.currentTarget.dataset.idx;
      const art = sessionArticles[idx];
      const filename = safeFilename(art.title);
      const html = buildArticleHtml(art);
      downloadFile(filename, html);
    }
  });
  document.querySelectorAll('.open').forEach(btn=>{
    btn.onclick = (e)=>{
      const idx = e.currentTarget.dataset.idx;
      const art = sessionArticles[idx];
      const html = buildArticleHtml(art);
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  });
}

// helper to toggle preview & snippet visibility and enable/disable buttons
function setPreviewVisible(show) {
  if(show) {
    previewSection.classList.remove('hidden');
    snippetSection.classList.remove('hidden');
    downloadBtn.removeAttribute('disabled');
    openBtn.removeAttribute('disabled');
    copySnippetBtn.removeAttribute('disabled');
    previewSnippetBtn.removeAttribute('disabled');
  } else {
    previewSection.classList.add('hidden');
    snippetSection.classList.add('hidden');
    downloadBtn.setAttribute('disabled', 'true');
    openBtn.setAttribute('disabled', 'true');
    copySnippetBtn.setAttribute('disabled', 'true');
    previewSnippetBtn.setAttribute('disabled', 'true');
  }
}

// initialize hidden state on load
setPreviewVisible(false);

// main generate handler
document.getElementById('generateBtn').addEventListener('click', ()=>{
  const data = collectFormData();
  // build html
  const html = buildArticleHtml(data);
  // show preview
  showPreview(html);
  // prepare snippet
  const filename = safeFilename(data.title);
  const snippet = buildBlogSnippet(data, filename);
  snippetBox.value = snippet;
  metaDisplay.textContent = data.meta;

  // now unhide preview + snippet and enable buttons
  setPreviewVisible(true);
});

document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const data = collectFormData();
  const html = buildArticleHtml(data);
  const filename = safeFilename(data.title);
  downloadFile(filename, html);
});

document.getElementById('openBtn').addEventListener('click', ()=>{
  const data = collectFormData();
  const html = buildArticleHtml(data);
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
});

document.getElementById('copySnippetBtn').addEventListener('click', ()=>{
  const txt = snippetBox.value;
  if(!txt) return alert('No snippet generated yet. Click "Generate" first.');
  navigator.clipboard.writeText(txt).then(()=> alert('Snippet copied'));
});

document.getElementById('previewSnippetBtn').addEventListener('click', ()=>{
  const snippet = snippetBox.value;
  if(!snippet) return alert('No snippet. Click Generate.');
  // open small preview window
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://cdn.tailwindcss.com" rel="stylesheet"></head><body class="p-6">${snippet}</body></html>`);
  w.document.close();
});

document.getElementById('addAnotherBtn').addEventListener('click', ()=>{
  const data = collectFormData();
  addToSession(data);
  alert('Article added to session list. You can download from the session list.');
});

function collectFormData(){
  const content = quill.root.innerHTML;
  const meta = generateMeta(content);
  metaDisplay.textContent = meta;
  return {
    title: titleEl.value || 'Untitled',
    author: authorEl.value || 'Anonymous',
    date: dateEl.value || `${yyyy}-${mm}-${dd}`,
    readingTime: readingEl.value || '5',
    imageUrl: imgEl.value || '',
    tags: tagsEl.value || '',
    content: content,
    meta: meta
  };
}

// utility: expose a way to auto-generate slug display on page load
slugDisplay.textContent = safeFilename(titleEl.value || 'article');
