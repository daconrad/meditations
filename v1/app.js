// App State
let meditationsData = null;
let currentTab = 'explore';
let currentRefSubtab = 'intro';
let activeFilters = {
  search: '',
  book: 'all',
  topics: []
};
let pagination = {
  currentPage: 1,
  pageSize: 10
};
let dailyPromptSection = null;
let userReflections = {};
let parsedGlossary = [];

// Stoic Theme names
const TOPIC_COLORS = {
  "Mortality & Death": "#e74c3c",
  "Leadership & Duty": "#2c3e50",
  "Anger & Patience": "#e67e22",
  "Mindfulness & Reason": "#2980b9",
  "Fate & Providence": "#9b59b6",
  "Self-Discipline & Desire": "#27ae60",
  "Gratitude & Friendship": "#d35400"
};

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  // Load saved preferences
  initPreferences();
  
  // Load journal reflections from localStorage
  loadReflections();
  
  // Fetch meditations data
  fetch('meditations.json')
    .then(res => res.json())
    .then(data => {
      meditationsData = data;
      
      // Parse glossary
      if (data.glossary) {
        parsedGlossary = parseGlossary(data.glossary);
      }
      
      // Render components
      initFilters();
      initDailyPrompt();
      renderEntries();
      renderReference();
      renderJournal();
      
      console.log("App initialized successfully with data.");
    })
    .catch(err => {
      console.error("Error loading meditations data:", err);
      document.getElementById('entries-list').innerHTML = `<div class="empty-state"><h3>Error Loading Data</h3><p>Could not fetch meditations.json. Please make sure the server is running.</p></div>`;
    });
    
  // Bind search input listener
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      activeFilters.search = e.target.value.trim();
      pagination.currentPage = 1;
      renderEntries();
    });
  }
});

// Init saved preferences
function initPreferences() {
  const savedTheme = localStorage.getItem('stoic_theme') || 'parchment';
  setTheme(savedTheme);
  
  const savedFontSize = localStorage.getItem('stoic_font_size') || '1.05';
  document.body.style.setProperty('--body-size', `${savedFontSize}rem`);
}

// Load Reflections
function loadReflections() {
  const stored = localStorage.getItem('stoic_reflections');
  if (stored) {
    try {
      userReflections = JSON.parse(stored);
    } catch(e) {
      console.error("Error parsing reflections:", e);
      userReflections = {};
    }
  }
}

// Save Reflections
function saveReflectionState() {
  localStorage.setItem('stoic_reflections', JSON.stringify(userReflections));
  renderJournal();
}

// switch between main tabs
function switchTab(tabId) {
  currentTab = tabId;
  
  // Update Tab buttons styling
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const isCurrent = tab.id === `tab-btn-${tabId}`;
    tab.classList.toggle('active', isCurrent);
    tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
  });
  
  // Toggle tab sections visibility
  document.getElementById('tab-explore').classList.toggle('hidden', tabId !== 'explore');
  document.getElementById('tab-journal').classList.toggle('hidden', tabId !== 'journal');
  document.getElementById('tab-reference').classList.toggle('hidden', tabId !== 'reference');
  
  // Perform updates
  if (tabId === 'journal') {
    renderJournal();
  } else if (tabId === 'reference') {
    renderReference();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// switch between reference sub-panes
function switchRefSubtab(subtabId) {
  currentRefSubtab = subtabId;
  
  document.querySelectorAll('.ref-subtab').forEach(btn => {
    btn.classList.toggle('active', btn.id === `subtab-btn-${subtabId}`);
  });
  
  document.getElementById('ref-intro').classList.toggle('hidden', subtabId !== 'intro');
  document.getElementById('ref-appendix').classList.toggle('hidden', subtabId !== 'appendix');
  document.getElementById('ref-notes').classList.toggle('hidden', subtabId !== 'notes');
  document.getElementById('ref-glossary').classList.toggle('hidden', subtabId !== 'glossary');
}

// set visual theme
function setTheme(themeName) {
  document.body.className = '';
  document.body.classList.add(`theme-${themeName}`);
  
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.classList.contains(`btn-${themeName}`));
  });
  
  localStorage.setItem('stoic_theme', themeName);
}

// adjust font size
function adjustFontSize(direction) {
  let sizeStr = document.body.style.getPropertyValue('--body-size') || '1.05rem';
  let size = parseFloat(sizeStr);
  
  size += direction * 0.05;
  // Constraint font-size between 0.85rem and 1.35rem
  size = Math.max(0.85, Math.min(1.35, size));
  
  document.body.style.setProperty('--body-size', `${size}rem`);
  localStorage.setItem('stoic_font_size', size.toFixed(2));
}

// Initialize filters panel
function initFilters() {
  // Populate Topics
  const topicsContainer = document.getElementById('topic-pills-container');
  if (topicsContainer) {
    topicsContainer.innerHTML = '';
    Object.keys(TOPIC_COLORS).forEach(topic => {
      const btn = document.createElement('button');
      btn.className = 'topic-btn';
      btn.innerText = topic;
      btn.onclick = () => toggleTopic(topic, btn);
      topicsContainer.appendChild(btn);
    });
  }
  
  // Populate Books list (1 to 12)
  const bookContainer = document.getElementById('book-selector-container');
  if (bookContainer) {
    // Keep the "All" button, clear others
    bookContainer.innerHTML = `<button class="book-btn active" id="book-btn-all" onclick="selectBook('all')">All</button>`;
    for (let i = 1; i <= 12; i++) {
      const btn = document.createElement('button');
      btn.className = 'book-btn';
      btn.id = `book-btn-${i}`;
      btn.innerText = i;
      btn.onclick = () => selectBook(i);
      bookContainer.appendChild(btn);
    }
  }
}

// Select a book to filter by
function selectBook(bookId) {
  activeFilters.book = bookId;
  
  // Update UI active buttons
  document.querySelectorAll('.book-btn').forEach(btn => {
    const isMatch = (bookId === 'all' && btn.id === 'book-btn-all') || (btn.id === `book-btn-${bookId}`);
    btn.classList.toggle('active', isMatch);
  });
  
  pagination.currentPage = 1;
  renderEntries();
}

// Toggle topic tags in filters
function toggleTopic(topic, element) {
  const index = activeFilters.topics.indexOf(topic);
  if (index > -1) {
    activeFilters.topics.splice(index, 1);
    if (element) element.classList.remove('active');
  } else {
    activeFilters.topics.push(topic);
    if (element) element.classList.add('active');
  }
  
  // If element is not passed, update all topic buttons visually
  if (!element) {
    document.querySelectorAll('.topic-btn').forEach(btn => {
      btn.classList.toggle('active', activeFilters.topics.includes(btn.innerText));
    });
  }
  
  pagination.currentPage = 1;
  renderEntries();
}

// Clear all active filters
function clearAllFilters() {
  activeFilters.search = '';
  activeFilters.book = 'all';
  activeFilters.topics = [];
  
  // Reset UI elements
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  
  selectBook('all');
  toggleTopic(null, null); // updates all topic pills visual states
}

// Toggle mobile filters drawer
function toggleMobileFilters() {
  document.getElementById('filter-panel').classList.toggle('mobile-active');
}

// Get flattened matching sections
function getFilteredSections() {
  if (!meditationsData) return [];
  
  let results = [];
  
  meditationsData.books.forEach(book => {
    // Skip if book doesn't match book filter
    if (activeFilters.book !== 'all' && book.book !== activeFilters.book) {
      return;
    }
    
    book.sections.forEach(sec => {
      // 1. Topic filter check
      if (activeFilters.topics.length > 0) {
        // Must match ANY of the selected topics (OR query)
        const hasTopicMatch = sec.topics && sec.topics.some(t => activeFilters.topics.includes(t));
        if (!hasTopicMatch) return;
      }
      
      // 2. Search query check
      if (activeFilters.search) {
        const query = activeFilters.search.toLowerCase();
        const textMatch = sec.text.toLowerCase().includes(query);
        const romanMatch = sec.roman.toLowerCase().includes(query);
        const bookMatch = book.title.toLowerCase().includes(query);
        const topicMatch = sec.topics && sec.topics.some(t => t.toLowerCase().includes(query));
        
        if (!textMatch && !romanMatch && !bookMatch && !topicMatch) {
          return;
        }
      }
      
      results.push({
        bookNum: book.book,
        bookTitle: book.title,
        roman: sec.roman,
        sectionNum: sec.section,
        text: sec.text,
        topics: sec.topics || []
      });
    });
  });
  
  return results;
}

// format text: highlights query + formats footnote links
function formatSectionText(text, searchQuery) {
  // Escape HTML tags to prevent XSS
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  // Highlight search text
  if (searchQuery) {
    const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    escaped = escaped.replace(regex, '<mark>$1</mark>');
  }
  
  // Format footnote refs: replace {fn:X} with clickable circle anchors
  escaped = escaped.replace(/\{fn:(\d+)\}/g, (match, fnNum) => {
    return `<a class="footnote-ref" onclick="handleFootnoteClick(event, ${fnNum})" role="button" aria-haspopup="dialog" aria-label="Footnote ${fnNum}">${fnNum}</a>`;
  });
  
  return escaped;
}

// Render main entries list
function renderEntries() {
  const container = document.getElementById('entries-list');
  if (!container) return;
  
  const filtered = getFilteredSections();
  
  // Render results header counter
  const resultsTitle = document.getElementById('results-count-title');
  if (resultsTitle) {
    if (activeFilters.search || activeFilters.book !== 'all' || activeFilters.topics.length > 0) {
      resultsTitle.innerText = `Search Results (${filtered.length})`;
    } else {
      resultsTitle.innerText = `All Entries (${filtered.length})`;
    }
  }
  
  // Render active filters display row
  const activeFiltersRow = document.getElementById('active-filters-row');
  if (activeFiltersRow) {
    const hasFilters = activeFilters.search || activeFilters.book !== 'all' || activeFilters.topics.length > 0;
    activeFiltersRow.classList.toggle('hidden', !hasFilters);
    
    if (hasFilters) {
      let badges = [];
      if (activeFilters.book !== 'all') {
        badges.push(`<span class="active-filter-badge">Book ${activeFilters.book}</span>`);
      }
      if (activeFilters.search) {
        badges.push(`<span class="active-filter-badge">Query: "${activeFilters.search}"</span>`);
      }
      activeFilters.topics.forEach(t => {
        badges.push(`<span class="active-filter-badge">${t}</span>`);
      });
      
      activeFiltersRow.innerHTML = `
        <span style="font-size: 0.85rem; font-weight:600; color:var(--text-muted);">Active Filters:</span>
        ${badges.join('')}
        <button class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size:0.75rem;" onclick="clearAllFilters()">Clear All</button>
      `;
    }
  }
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" width="48" height="48"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </div>
        <h3>No Entries Found</h3>
        <p>No passages match your current filter settings. Try broadening your keywords or removing some theme filters.</p>
        <button class="btn btn-primary" onclick="clearAllFilters()">Clear Filters</button>
      </div>
    `;
    document.getElementById('pagination-container').classList.add('hidden');
    return;
  }
  
  // Apply pagination
  const totalPages = Math.ceil(filtered.length / pagination.pageSize);
  pagination.currentPage = Math.min(pagination.currentPage, totalPages);
  
  const startIdx = (pagination.currentPage - 1) * pagination.pageSize;
  const endIdx = startIdx + pagination.pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);
  
  // Render cards
  container.innerHTML = '';
  pageItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'entry-card';
    
    // Check if reflection exists
    const reflectionKey = `${item.bookNum}-${item.sectionNum}`;
    const reflection = userReflections[reflectionKey];
    
    // Build topics pills
    const topicsHtml = item.topics.map(t => `<span class="entry-topic-tag" style="border-left: 2px solid ${TOPIC_COLORS[t] || 'gray'};">${t}</span>`).join('');
    
    card.innerHTML = `
      <div class="entry-meta">
        <div class="entry-source">Book ${item.bookNum}, Section ${item.roman}</div>
        <div class="entry-topics">${topicsHtml}</div>
      </div>
      <p class="entry-text">${formatSectionText(item.text, activeFilters.search)}</p>
      
      <!-- User Reflection block if it exists -->
      ${reflection ? `
        <div class="entry-journal-preview" id="reflection-view-${reflectionKey}">
          <div class="journal-preview-header">
            <span>My Reflection — ${new Date(reflection.date).toLocaleDateString()}</span>
            <div>
              <button class="text-btn" style="display:inline-flex;" onclick="openInlineEditor('${item.bookNum}', '${item.sectionNum}')">Edit</button>
              <span style="color:var(--border-color)">|</span>
              <button class="text-btn" style="display:inline-flex; color:red;" onclick="deleteUserReflection('${item.bookNum}', '${item.sectionNum}')">Delete</button>
            </div>
          </div>
          <p class="journal-preview-text">${reflection.text.replace(/\n/g, '<br>')}</p>
        </div>
      ` : ''}
      
      <div class="entry-actions">
        <button class="btn btn-secondary" onclick="openInlineEditor('${item.bookNum}', '${item.sectionNum}')">
          <svg viewBox="0 0 24 24" width="16" height="16" class="btn-icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg>
          ${reflection ? 'Edit Reflection' : 'Reflect on this'}
        </button>
      </div>
      
      <!-- Collapsible Inline Editor -->
      <div class="inline-editor hidden" id="editor-${reflectionKey}">
        <textarea id="reflection-input-${reflectionKey}" rows="3" placeholder="Type your personal insights or how you can apply this Stoic lesson to your life today...">${reflection ? reflection.text : ''}</textarea>
        <div class="editor-buttons">
          <button class="btn btn-secondary" onclick="closeInlineEditor('${item.bookNum}', '${item.sectionNum}')">Cancel</button>
          <button class="btn btn-accent" onclick="saveUserReflection('${item.bookNum}', '${item.sectionNum}')">Save Reflection</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  
  // Render pagination controls
  const pagContainer = document.getElementById('pagination-container');
  if (pagContainer) {
    if (totalPages > 1) {
      pagContainer.classList.remove('hidden');
      document.getElementById('pagination-info').innerText = `Page ${pagination.currentPage} of ${totalPages}`;
      document.getElementById('btn-prev-page').disabled = pagination.currentPage === 1;
      document.getElementById('btn-next-page').disabled = pagination.currentPage === totalPages;
    } else {
      pagContainer.classList.add('hidden');
    }
  }
}

function prevPage() {
  if (pagination.currentPage > 1) {
    pagination.currentPage--;
    renderEntries();
    scrollToTopList();
  }
}

function nextPage() {
  pagination.currentPage++;
  renderEntries();
  scrollToTopList();
}

function scrollToTopList() {
  const header = document.querySelector('.results-header');
  if (header) {
    header.scrollIntoView({ behavior: 'smooth' });
  }
}

// Inline Reflection Editor functions
function openInlineEditor(book, section) {
  const key = `${book}-${section}`;
  document.getElementById(`editor-${key}`).classList.remove('hidden');
  
  // Hide view panel if it exists
  const viewPanel = document.getElementById(`reflection-view-${key}`);
  if (viewPanel) viewPanel.classList.add('hidden');
}

function closeInlineEditor(book, section) {
  const key = `${book}-${section}`;
  document.getElementById(`editor-${key}`).classList.add('hidden');
  
  // Show view panel if it exists
  const viewPanel = document.getElementById(`reflection-view-${key}`);
  if (viewPanel) viewPanel.classList.remove('hidden');
}

function saveUserReflection(book, section) {
  const key = `${book}-${section}`;
  const text = document.getElementById(`reflection-input-${key}`).value.trim();
  
  if (!text) {
    alert("Please enter reflection text.");
    return;
  }
  
  userReflections[key] = {
    text: text,
    date: new Date().toISOString(),
    book: parseInt(book),
    section: parseInt(section)
  };
  
  saveReflectionState();
  renderEntries();
}

function deleteUserReflection(book, section) {
  if (confirm("Are you sure you want to delete this reflection?")) {
    const key = `${book}-${section}`;
    delete userReflections[key];
    saveReflectionState();
    renderEntries();
  }
}

// Daily prompt card initialization
function initDailyPrompt() {
  if (!meditationsData) return;
  
  // If we haven't selected a daily prompt or want a new one
  if (!dailyPromptSection) {
    // Select a random book, then random section
    const randomBookIdx = Math.floor(Math.random() * meditationsData.books.length);
    const book = meditationsData.books[randomBookIdx];
    
    const randomSecIdx = Math.floor(Math.random() * book.sections.length);
    const sec = book.sections[randomSecIdx];
    
    dailyPromptSection = {
      bookNum: book.book,
      roman: sec.roman,
      sectionNum: sec.section,
      text: sec.text
    };
  }
  
  const quoteText = document.getElementById('prompt-quote-text');
  const quoteSource = document.getElementById('prompt-source');
  
  if (quoteText) {
    quoteText.innerHTML = formatSectionText(dailyPromptSection.text, '');
    
    // Add onclick trigger for Reflect on this button
    const reflectBtn = document.getElementById('prompt-reflect-btn');
    if (reflectBtn) {
      reflectBtn.onclick = () => toggleDailyReflection();
    }
  }
  
  const sourceEl = document.getElementById('prompt-quote-source');
  if (sourceEl) {
    sourceEl.innerText = `Book ${dailyPromptSection.bookNum}, Section ${dailyPromptSection.roman}`;
  }
  
  // Set placeholder inside reflection box
  const reflectionKey = `${dailyPromptSection.bookNum}-${dailyPromptSection.sectionNum}`;
  const inputEl = document.getElementById('daily-reflection-input');
  if (inputEl) {
    inputEl.value = userReflections[reflectionKey] ? userReflections[reflectionKey].text : '';
  }
}

function refreshDailyPrompt() {
  dailyPromptSection = null;
  document.getElementById('daily-reflection-editor').classList.add('hidden');
  initDailyPrompt();
}

function toggleDailyReflection() {
  const el = document.getElementById('daily-reflection-editor');
  el.classList.toggle('hidden');
  if (!el.classList.contains('hidden')) {
    document.getElementById('daily-reflection-input').focus();
  }
}

function saveDailyReflection() {
  if (!dailyPromptSection) return;
  
  const text = document.getElementById('daily-reflection-input').value.trim();
  if (!text) {
    alert("Please enter reflection text.");
    return;
  }
  
  const key = `${dailyPromptSection.bookNum}-${dailyPromptSection.sectionNum}`;
  userReflections[key] = {
    text: text,
    date: new Date().toISOString(),
    book: dailyPromptSection.bookNum,
    section: dailyPromptSection.sectionNum
  };
  
  saveReflectionState();
  toggleDailyReflection();
  renderEntries(); // refresh lists if currently browsing same entry
  alert("Reflection saved to your Journal!");
}

// Footnote Click trigger
function handleFootnoteClick(event, fnNum) {
  event.preventDefault();
  event.stopPropagation();
  
  if (!meditationsData || !meditationsData.footnotes) return;
  
  const footnoteText = meditationsData.footnotes[fnNum] || `Footnote ${fnNum} text not found.`;
  
  // Display footnote drawer at bottom
  const drawer = document.getElementById('footnote-drawer');
  const drawerTitle = document.getElementById('footnote-drawer-title');
  const drawerText = document.getElementById('footnote-drawer-text');
  
  if (drawer && drawerText) {
    drawerTitle.innerText = `Footnote Context — Note ${fnNum}`;
    drawerText.innerText = footnoteText;
    drawer.classList.remove('hidden');
  }
}

function closeFootnoteDrawer() {
  document.getElementById('footnote-drawer').classList.add('hidden');
}

// Render User Journal entries tab
function renderJournal() {
  const container = document.getElementById('journal-list');
  const statsContainer = document.getElementById('journal-stats');
  if (!container) return;
  
  const keys = Object.keys(userReflections);
  
  // Render Stats
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-card">
        <span class="stat-value">${keys.length}</span>
        <span class="stat-label">Total Reflections</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${keys.length > 0 ? new Date(Math.max(...keys.map(k => new Date(userReflections[k].date)))).toLocaleDateString() : 'N/A'}</span>
        <span class="stat-label">Last Active</span>
      </div>
    `;
  }
  
  if (keys.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" width="48" height="48"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </div>
        <h3>Your Stoic Journal is Empty</h3>
        <p>Browse the Meditations and click "Reflect on this" on any passage to record your reflections, thoughts, and lessons here.</p>
        <button class="btn btn-primary" onclick="switchTab('explore')">Start Exploring</button>
      </div>
    `;
    return;
  }
  
  // Sort reflections by date descending
  const sortedReflections = keys.map(k => ({ key: k, ...userReflections[k] }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
    
  container.innerHTML = '';
  sortedReflections.forEach(item => {
    // Find original section text
    let originalText = "Original passage not loaded.";
    let romanSection = "";
    if (meditationsData) {
      const book = meditationsData.books.find(b => b.book === item.book);
      if (book) {
        const sec = book.sections.find(s => s.section === item.section);
        if (sec) {
          originalText = sec.text;
          romanSection = sec.roman;
        }
      }
    }
    
    const card = document.createElement('div');
    card.className = 'journal-item-card';
    card.innerHTML = `
      <div class="journal-item-grid">
        <div class="journal-source-text">
          <h4 class="entry-source" style="margin-bottom:0.75rem;">Book ${item.book}, Section ${romanSection}</h4>
          <p class="entry-text" style="font-size:0.95rem; line-height:1.6; color:var(--text-muted);">${formatSectionText(originalText, '')}</p>
        </div>
        <div class="journal-reflection-text">
          <div>
            <div class="journal-preview-header" style="margin-bottom:1rem;">
              <span>My Reflection</span>
              <span class="reflection-date">${new Date(item.date).toLocaleDateString()}</span>
            </div>
            <p class="reflection-body" id="reflection-body-display-${item.key}">${item.text.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="reflection-actions">
            <button class="btn btn-secondary" onclick="editJournalReflection('${item.key}')">Edit</button>
            <button class="btn btn-secondary" style="color:red;" onclick="deleteJournalReflection('${item.key}')">Delete</button>
          </div>
        </div>
      </div>
      
      <!-- Edit Mode overlay -->
      <div class="inline-editor hidden" id="journal-editor-${item.key}">
        <textarea id="journal-editor-input-${item.key}" rows="4">${item.text}</textarea>
        <div class="editor-buttons">
          <button class="btn btn-secondary" onclick="closeJournalEditor('${item.key}')">Cancel</button>
          <button class="btn btn-accent" onclick="saveJournalEditor('${item.key}')">Save Edits</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function editJournalReflection(key) {
  document.getElementById(`journal-editor-${key}`).classList.remove('hidden');
  document.getElementById(`journal-editor-input-${key}`).focus();
}

function closeJournalEditor(key) {
  document.getElementById(`journal-editor-${key}`).classList.add('hidden');
}

function saveJournalEditor(key) {
  const newText = document.getElementById(`journal-editor-input-${key}`).value.trim();
  if (!newText) {
    alert("Reflection text cannot be empty.");
    return;
  }
  
  userReflections[key].text = newText;
  userReflections[key].date = new Date().toISOString();
  
  saveReflectionState();
  renderJournal();
}

function deleteJournalReflection(key) {
  if (confirm("Are you sure you want to delete this journal reflection?")) {
    delete userReflections[key];
    saveReflectionState();
    renderJournal();
    renderEntries(); // refresh explorer view list
  }
}

// Render reference tab (Appendix, Glossary, Notes, Introduction)
function renderReference() {
  if (!meditationsData) return;
  
  // Format long blocks by wrapping sentences/paragraphs
  const formatParagraphs = (text) => {
    return text.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
  };
  
  const introEl = document.getElementById('ref-intro-text');
  if (introEl) {
    // Break the introduction text into logical paragraphs if it's not already
    // The Casaubon translation introduction parsed text is long.
    introEl.innerHTML = formatParagraphs(meditationsData.introduction);
  }
  
  const appendixEl = document.getElementById('ref-appendix-text');
  if (appendixEl) {
    appendixEl.innerHTML = formatParagraphs(meditationsData.appendix);
  }
  
  const notesEl = document.getElementById('ref-notes-text');
  if (notesEl) {
    notesEl.innerHTML = formatParagraphs(meditationsData.notes);
  }
  
  renderGlossaryList(parsedGlossary);
}

// Render Stoic Glossary items
function renderGlossaryList(items) {
  const container = document.getElementById('ref-glossary-text');
  if (!container) return;
  
  if (items.length === 0) {
    container.innerHTML = `<p style="font-style:italic; color:var(--text-muted);">No terms matched your search filter.</p>`;
    return;
  }
  
  container.innerHTML = '';
  items.forEach(item => {
    const termDiv = document.createElement('div');
    termDiv.className = 'glossary-item';
    termDiv.innerHTML = `
      <h3 class="glossary-term">${item.term}</h3>
      <p class="glossary-def">${item.definition}</p>
    `;
    container.appendChild(termDiv);
  });
}

// Filter Glossary dynamically
function filterGlossary() {
  const query = document.getElementById('glossary-search-input').value.trim().toLowerCase();
  
  if (!query) {
    renderGlossaryList(parsedGlossary);
    return;
  }
  
  const filtered = parsedGlossary.filter(item => {
    return item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query);
  });
  
  renderGlossaryList(filtered);
}

// Parse Glossary string into list of objects (runs once on load)
function parseGlossary(rawText) {
  const terms = ["ADRIANUS", "AGRIPPA", "ALEXANDER", "ANTISTHENES", "ANTONINUS", "APATHIA", "APELLES", "APOLLONIUS", "APOSTEME", "ARCHIMEDES", "ATHOS", "AUGUSTUS", "CIRCUS", "EUDOXUS", "FATAL", "FORTUIT", "FRONTO", "PARMULARII", "PHEIDIAS", "PHILIPPUS", "PHOCION", "STOICS"];
  
  // Sort terms descending by length
  terms.sort((a,b) => b.length - a.length);
  
  const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'g');
  
  let matches = [];
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    matches.push({ term: match[1], index: match.index });
  }
  
  // Re-sort matches ascending by index to maintain alphabetical order
  matches.sort((a, b) => a.index - b.index);
  
  let glossaryList = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = (i + 1 < matches.length) ? matches[i+1].index : rawText.length;
    
    const termEnd = current.index + current.term.length;
    let definition = rawText.substring(termEnd, nextIndex).trim();
    
    // Clean up definition punctuation prefix
    definition = definition.replace(/^[:,\s\-]+/, '');
    
    glossaryList.push({
      term: current.term,
      definition: definition
    });
  }
  
  return glossaryList;
}
