document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  let releaseNotes = [];
  let lastFilteredNotes = [];
  let currentFilter = 'all';
  let searchQuery = '';
  
  // ==========================================================================
  // DOM ELEMENTS
  // ==========================================================================
  const refreshBtn = document.getElementById('refreshBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterPills = document.querySelectorAll('.filter-pill');
  const themeCheckbox = document.getElementById('themeCheckbox');
  
  const initialLoader = document.getElementById('initialLoader');
  const feedContainer = document.getElementById('feedContainer');
  const emptyState = document.getElementById('emptyState');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  
  // Tweet Composer Dialog elements
  const tweetComposer = document.getElementById('tweetComposer');
  const closeDialogBtn = document.getElementById('closeDialogBtn');
  const cancelTweetBtn = document.getElementById('cancelTweetBtn');
  const tweetForm = document.getElementById('tweetForm');
  const tweetTextarea = document.getElementById('tweetTextarea');
  const charCount = document.getElementById('charCount');
  const progressCircle = document.querySelector('.progress-ring__circle');
  const tweetAttachedUrl = document.getElementById('tweetAttachedUrl');

  // SVG Progress circle values
  const circleRadius = 9;
  const circleCircumference = 2 * Math.PI * circleRadius;
  if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressCircle.style.strokeDashoffset = circleCircumference;
  }

  // ==========================================================================
  // THEME MANAGEMENT (Light / Dark Mode)
  // ==========================================================================
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeCheckbox) themeCheckbox.checked = true;
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeCheckbox) themeCheckbox.checked = false;
  }

  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================
  
  // Refresh Button click
  refreshBtn.addEventListener('click', () => {
    fetchReleaseNotes(true);
  });
  
  // Export CSV Button click
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }
  
  // Search Input change
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
    filterAndRender();
  });
  
  // Clear Search Button click
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    filterAndRender();
    searchInput.focus();
  });

  // Reset Filters Empty State click
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    // Reset category filter pills to "All"
    filterPills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
      p.setAttribute('aria-checked', p.getAttribute('data-filter') === 'all' ? 'true' : 'false');
    });
    currentFilter = 'all';
    
    filterAndRender();
  });
  
  // Category Filter Pill clicks
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Toggle active states
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-checked', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-checked', 'true');
      
      currentFilter = pill.getAttribute('data-filter');
      filterAndRender();
    });
  });

  // Close Composer Dialog
  closeDialogBtn.addEventListener('click', () => tweetComposer.close());
  cancelTweetBtn.addEventListener('click', () => tweetComposer.close());
  
  // Real-time Character Counter in Tweet Textarea
  tweetTextarea.addEventListener('input', updateCharCounter);

  // Submit Tweet Form
  tweetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tweetText = tweetTextarea.value.trim();
    if (!tweetText) return;
    
    // Open Twitter Web Intent in a new tab
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
    
    tweetComposer.close();
  });

  // Native Dialog Light Dismiss Fallback for Safari/Firefox
  // When backdrop is clicked, close the modal.
  if (tweetComposer && !('closedBy' in HTMLDialogElement.prototype)) {
    tweetComposer.addEventListener('click', (event) => {
      if (event.target !== tweetComposer) return;
      
      const rect = tweetComposer.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      
      if (!isInside) {
        tweetComposer.close();
      }
    });
  }

  // ==========================================================================
  // DATA FETCHING & PROCESS API
  // ==========================================================================
  async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true, forceRefresh);
    try {
      const url = forceRefresh ? '/api/notes?refresh=true' : '/api/notes';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message);
      }
      
      releaseNotes = result.data || [];
      filterAndRender();
      
      // Notify warning fallback if server returned cache fallback on error
      if (result.status === 'warning') {
        console.warn(result.message);
        alert(result.message);
      }
      
    } catch (error) {
      console.error('Error fetching release notes:', error);
      alert(`Could not fetch BigQuery release notes. ${error.message}`);
      
      // If we already had notes, hide loader, otherwise show empty state
      if (releaseNotes.length === 0) {
        showEmptyState(true);
      }
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading, isRefresh = false) {
    if (isLoading) {
      refreshBtn.classList.add('loading');
      refreshBtn.disabled = true;
      if (!isRefresh) {
        // Fullscreen loading on initial load
        initialLoader.style.display = 'flex';
        feedContainer.style.display = 'none';
        emptyState.style.display = 'none';
      }
    } else {
      refreshBtn.classList.remove('loading');
      refreshBtn.disabled = false;
      initialLoader.style.display = 'none';
    }
  }

  // ==========================================================================
  // FILTER & SEARCH LOGIC
  // ==========================================================================
  function filterAndRender() {
    let filtered = [];
    
    releaseNotes.forEach(entry => {
      // Filter individual updates within daily entries
      const matchedUpdates = entry.updates.filter(update => {
        // 1. Filter by category type
        const matchesFilter = currentFilter === 'all' || 
          update.type.toLowerCase() === currentFilter.toLowerCase();
        
        // 2. Filter by search query
        const textToSearch = `${update.type} ${update.text_content} ${entry.date}`.toLowerCase();
        const matchesSearch = !searchQuery || textToSearch.includes(searchQuery);
        
        return matchesFilter && matchesSearch;
      });
      
      if (matchedUpdates.length > 0) {
        filtered.push({
          ...entry,
          updates: matchedUpdates
        });
      }
    });
    
    lastFilteredNotes = filtered;
    renderFeed(filtered);
  }

  // ==========================================================================
  // RENDER DYNAMIC CARD FEED
  // ==========================================================================
  function renderFeed(filteredNotes) {
    if (filteredNotes.length === 0) {
      feedContainer.style.display = 'none';
      showEmptyState(true);
      return;
    }
    
    showEmptyState(false);
    feedContainer.style.display = 'flex';
    feedContainer.innerHTML = '';
    
    filteredNotes.forEach(entry => {
      // Create Daily Container
      const dailySection = document.createElement('section');
      dailySection.className = 'daily-section';
      
      // Daily Header (Date Sticky Row)
      const dailyHeader = document.createElement('div');
      dailyHeader.className = 'daily-header';
      
      const dailyTitle = document.createElement('h3');
      dailyTitle.className = 'daily-title';
      dailyTitle.textContent = entry.date;
      
      const dailyLine = document.createElement('div');
      dailyLine.className = 'daily-line';
      
      dailyHeader.appendChild(dailyTitle);
      dailyHeader.appendChild(dailyLine);
      dailySection.appendChild(dailyHeader);
      
      // Updates Grid inside daily section
      const updatesGrid = document.createElement('div');
      updatesGrid.className = 'updates-grid';
      
      entry.updates.forEach((update, index) => {
        // Unique ID for selection state
        const updateId = `${entry.id || entry.date}-${index}`;
        
        // Wrapper for selection state tracking
        const wrapper = document.createElement('div');
        wrapper.className = 'update-card-wrapper';
        wrapper.id = `wrapper-${updateId}`;
        
        // Setup card HTML content
        const tagClass = getTagClass(update.type);
        
        wrapper.innerHTML = `
          <article class="update-card" data-id="${updateId}">
            <div class="card-header-row">
              <span class="category-tag ${tagClass}">
                <span class="dot dot-${update.type.toLowerCase()}"></span>
                ${update.type}
              </span>
              <button class="card-select-trigger" title="Select update" aria-label="Select update">
                <i data-lucide="check"></i>
              </button>
            </div>
            
            <div class="card-body">
              ${update.html_content}
            </div>
            
            <div class="card-actions">
              <button class="btn-card-action copy-text-btn" title="Copy update text to clipboard">
                <i data-lucide="copy"></i>
                <span>Copy</span>
              </button>
              <button class="btn-card-action share-tweet-btn" title="Tweet this update">
                <i data-lucide="twitter"></i>
                <span>Select & Tweet</span>
              </button>
            </div>
          </article>
        `;
        
        // Select event on wrapper/card
        const trigger = wrapper.querySelector('.card-select-trigger');
        const triggerSelect = () => {
          // Deselect others, select this (single-selection model)
          document.querySelectorAll('.update-card-wrapper.selected').forEach(el => {
            if (el.id !== wrapper.id) el.classList.remove('selected');
          });
          wrapper.classList.toggle('selected');
        };
        
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerSelect();
        });
        
        // Click on card body to select as well for user convenience
        wrapper.querySelector('.update-card').addEventListener('click', (e) => {
          // Prevent selecting when clicking hyperlinks or actions
          if (e.target.tagName === 'A' || e.target.closest('a')) return;
          if (e.target.closest('.share-tweet-btn')) return;
          if (e.target.closest('.copy-text-btn')) return;
          if (e.target.closest('.card-select-trigger')) return;
          
          triggerSelect();
        });
        
        // Copy to clipboard action
        const copyBtn = wrapper.querySelector('.copy-text-btn');
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(update.text_content);
            
            // Visual feedback
            const btnSpan = copyBtn.querySelector('span');
            btnSpan.textContent = 'Copied!';
            copyBtn.style.color = 'var(--color-feature)';
            
            setTimeout(() => {
              btnSpan.textContent = 'Copy';
              copyBtn.style.color = '';
            }, 1800);
            
          } catch (err) {
            console.error('Failed to copy text:', err);
            alert('Could not copy text to clipboard.');
          }
        });
        
        // Share/Tweet button action
        const shareBtn = wrapper.querySelector('.share-tweet-btn');
        shareBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Select this card visually
          document.querySelectorAll('.update-card-wrapper.selected').forEach(el => el.classList.remove('selected'));
          wrapper.classList.add('selected');
          
          // Trigger Composer
          openTweetComposer(entry, update);
        });
        
        updatesGrid.appendChild(wrapper);
      });
      
      dailySection.appendChild(updatesGrid);
      feedContainer.appendChild(dailySection);
    });
    
    // Reinforce lucide icons
    lucide.createIcons();
  }

  function getTagClass(type) {
    const lowercase = type.toLowerCase();
    if (lowercase === 'feature') return 'tag-feature';
    if (lowercase === 'change') return 'tag-change';
    if (lowercase === 'deprecation') return 'tag-deprecation';
    return 'tag-default';
  }

  function showEmptyState(show) {
    emptyState.style.display = show ? 'flex' : 'none';
  }

  // ==========================================================================
  // EXPORT TO CSV LOGIC
  // ==========================================================================
  function exportToCSV() {
    if (!lastFilteredNotes || lastFilteredNotes.length === 0) {
      alert('No data available to export.');
      return;
    }
    
    // CSV Header row
    const csvRows = [['Date', 'Type', 'Update Content', 'Source Link']];
    
    lastFilteredNotes.forEach(entry => {
      entry.updates.forEach(update => {
        // Clean and escape double quotes for CSV values
        const cleanContent = update.text_content.replace(/"/g, '""');
        csvRows.push([
          `"${entry.date}"`,
          `"${update.type}"`,
          `"${cleanContent}"`,
          `"${entry.link}"`
        ]);
      });
    });
    
    // Join values with commas and rows with newlines
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    
    // Create download blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // Generate descriptive filename based on active filters
    let filename = 'bigquery_release_notes';
    if (currentFilter !== 'all') {
      filename += `_${currentFilter.toLowerCase()}`;
    }
    if (searchQuery) {
      // Escape non-alphanumeric chars
      filename += `_search_${searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    }
    filename += '.csv';
    
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================================================
  // TWEET COMPOSER PREVIEW MODAL LOGIC
  // ==========================================================================
  function openTweetComposer(entry, update) {
    // Format the URL
    // Twitter counts URL as exactly 23 characters, but visually we display shortened version
    const entryUrl = entry.link || 'https://cloud.google.com/bigquery/docs/release-notes';
    tweetAttachedUrl.textContent = entryUrl.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30) + '...';
    
    // Auto-compose a tweet draft text that fits in 280 chars
    // Structure: BQ Update [Date] - [Type]: [Snippet] #BigQuery #GoogleCloud [URL]
    const header = `BigQuery Update (${entry.date}) - ${update.type}: `;
    const footer = ` #BigQuery #GoogleCloud\n${entryUrl}`;
    
    // Twitter counts URL as 23 characters, so let's calculate available character length
    // Total available = 280 - (header length) - (footer hashtags length) - (23 URL length) - spacer spaces
    const hashtags = ` #BigQuery #GoogleCloud\n`;
    const urlLengthForTwitter = 23;
    const reservedLength = header.length + hashtags.length + urlLengthForTwitter + 1; // plus padding
    const maxSnippetLength = 280 - reservedLength;
    
    let snippet = update.text_content;
    if (snippet.length > maxSnippetLength) {
      snippet = snippet.substring(0, maxSnippetLength - 4) + '...';
    }
    
    const draftText = `${header}${snippet}${hashtags}${entryUrl}`;
    
    // Insert into textarea
    tweetTextarea.value = draftText;
    updateCharCounter();
    
    // Open natively in the top layer
    tweetComposer.showModal();
  }

  function updateCharCounter() {
    const text = tweetTextarea.value;
    
    // Smart X URL counting: X counts links as exactly 23 chars.
    // Let's replace any HTTP/HTTPS links in the text with a 23-char placeholder for exact counting!
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let visualLength = text.length;
    urls.forEach(url => {
      // Remove URL length, add 23
      visualLength = visualLength - url.length + 23;
    });
    
    charCount.textContent = visualLength;
    
    // Color states and character circle progress ring
    const percent = Math.min((visualLength / 280) * 100, 100);
    const offset = circleCircumference - (percent / 100) * circleCircumference;
    
    if (progressCircle) {
      progressCircle.style.strokeDashoffset = offset;
      
      if (visualLength >= 280) {
        progressCircle.style.stroke = '#ef4444'; // Red limit exceeded
        charCount.style.color = '#ef4444';
      } else if (visualLength >= 260) {
        progressCircle.style.stroke = '#f59e0b'; // Amber warning
        charCount.style.color = '#f59e0b';
      } else {
        progressCircle.style.stroke = '#3b82f6'; // Blue normal
        charCount.style.color = '#94a3b8';
      }
    }
    
    // Disable submit button if empty or over limit
    const submitBtn = document.getElementById('submitTweetBtn');
    if (submitBtn) {
      submitBtn.disabled = (visualLength === 0 || visualLength > 280);
    }
  }

  // ==========================================================================
  // INITIAL APP INITS
  // ==========================================================================
  
  // Initial loading fetch
  fetchReleaseNotes(false);
});
