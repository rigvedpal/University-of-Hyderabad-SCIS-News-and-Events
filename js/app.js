/* ============================================================
   SCIS News & Events - Full Stack Frontend Logic
   ============================================================ */

const state = {
  activeCat: 'all',
  activeView: 'grid',
  query: '',
  timeFilter: 'all',
  events: [],
  stats: null,
  editingId: null,
  postLoginAction: null,
};

const authState = {
  token: localStorage.getItem('scisAuthToken') || '',
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem('scisAuthUser') || 'null');
    } catch {
      return null;
    }
  })(),
};

const CATS = {
  seminar: { label: 'Seminar', color: '#1a3a6b', bg: '#e8edf7', text: '#0f2347' },
  'phd-defence': { label: 'PhD Defence', color: '#6d28d9', bg: '#ede9fe', text: '#4c1d95' },
  'pre-phd': { label: 'Pre-PhD Talk', color: '#0f766e', bg: '#ccfbf1', text: '#065f46' },
  talk: { label: 'Talk', color: '#b45309', bg: '#fef3c7', text: '#78350f' },
  news: { label: 'News', color: '#0369a1', bg: '#e0f2fe', text: '#0c4a6e' },
  hackathon: { label: 'Hackathon', color: '#be185d', bg: '#fce7f3', text: '#831843' },
  workshop: { label: 'Workshop', color: '#065f46', bg: '#d1fae5', text: '#064e3b' },
};

function isAuthenticated() {
  return Boolean(authState.token && authState.user);
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isUpcoming(event) {
  return event.date ? new Date(`${event.date}T00:00:00`) >= getToday() : false;
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const aUpcoming = isUpcoming(a);
    const bUpcoming = isUpcoming(b);
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming) return new Date(a.date) - new Date(b.date);
    return new Date(b.date) - new Date(a.date);
  });
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDay(dateValue) {
  return new Date(`${dateValue}T00:00:00`).getDate();
}

function getMon(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });
}

function getYear(dateValue) {
  return new Date(`${dateValue}T00:00:00`).getFullYear();
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function catBadgeHTML(cat) {
  const meta = CATS[cat] || CATS.talk;
  return `<span class="cat-badge" style="background:${meta.bg};color:${meta.text}">${meta.label}</span>`;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function listVisualHTML(event) {
  if (event.image) {
    return `<div class="list-card-visual"><img class="list-card-image" src="${escapeHTML(event.image)}" alt="${escapeHTML(event.title)}" loading="lazy"></div>`;
  }
  const label = (CATS[event.cat]?.label || 'Event').toUpperCase();
  return `<div class="list-card-visual" aria-hidden="true"><div class="list-card-placeholder">${label}</div></div>`;
}

function tickerLabel(event) {
  const prefixMap = {
    seminar: 'Seminar:',
    'pre-phd': 'Pre-PhD Talk:',
    'phd-defence': 'PhD Defence:',
    hackathon: 'Hackathon:',
    workshop: 'Workshop:',
    talk: 'Talk:',
    news: 'News:',
  };
  const prefix = prefixMap[event.cat] || 'Event:';
  const when = [formatDate(event.date), event.time].filter(Boolean).join(', ');
  const where = event.venue ? `, ${event.venue}` : '';
  return `${prefix} ${event.title} - ${when}${where}`;
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (authState.token) {
    headers.Authorization = `Bearer ${authState.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && authState.token) {
      logout({ silent: true });
      updateAuthUI();
    }
    const message = typeof payload === 'string' ? payload : payload.message;
    throw new Error(message || 'Request failed');
  }

  return payload;
}

async function loadEvents() {
  const [events, stats] = await Promise.all([
    apiFetch('/api/events'),
    apiFetch('/api/events/stats'),
  ]);
  state.events = Array.isArray(events) ? events : [];
  state.stats = stats;
}

function renderTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;

  const featured = sortEvents(state.events)
    .filter((event) => event.date && isUpcoming(event))
    .slice(0, 3);

  if (!featured.length) {
    track.innerHTML = '<span class="ticker-item">No upcoming events right now</span>';
    return;
  }

  const loopItems = [...featured, ...featured];
  track.innerHTML = loopItems.map((event) => `
    <button class="ticker-item" type="button" onclick="jumpToEventCard(${event.id})" aria-label="Jump to ${escapeHTML(event.title)}">
      ${escapeHTML(tickerLabel(event))}
    </button>
  `).join('');
}

function syncControlsToDefaultFilters() {
  state.activeCat = 'all';
  state.query = '';
  state.timeFilter = 'all';
  const searchEl = document.getElementById('search-input');
  const timeEl = document.getElementById('time-filter');
  if (searchEl) searchEl.value = '';
  if (timeEl) timeEl.value = 'all';
  document.querySelectorAll('.pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.cat === 'all');
  });
}

function spotlightEventCard(card, color) {
  if (!card) return;
  const existing = card.querySelector('.card-spotlight-border');
  if (existing) existing.remove();

  card.style.setProperty('--spotlight-color', color);
  card.classList.remove('card-spotlight');
  void card.offsetWidth;
  card.classList.add('card-spotlight');

  const width = card.offsetWidth + 8;
  const height = card.offsetHeight + 8;
  const radius = Math.max(10, parseFloat(getComputedStyle(card).borderRadius || '16'));
  const svgNS = 'http://www.w3.org/2000/svg';
  const wrapper = document.createElement('div');
  wrapper.className = 'card-spotlight-border';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');

  const makeRect = (className) => {
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('class', className);
    rect.setAttribute('x', '4');
    rect.setAttribute('y', '4');
    rect.setAttribute('width', `${width - 8}`);
    rect.setAttribute('height', `${height - 8}`);
    rect.setAttribute('rx', `${radius}`);
    rect.setAttribute('ry', `${radius}`);
    rect.setAttribute('pathLength', '100');
    return rect;
  };

  svg.appendChild(makeRect('card-spotlight-base'));
  svg.appendChild(makeRect('card-spotlight-glow'));
  svg.appendChild(makeRect('card-spotlight-glow-soft'));
  wrapper.appendChild(svg);
  card.appendChild(wrapper);

  window.setTimeout(() => {
    card.classList.remove('card-spotlight');
    wrapper.remove();
  }, 2200);
}

function jumpToEventCard(id) {
  let card = document.querySelector(`[data-event-id="${id}"]`);
  if (!card) {
    syncControlsToDefaultFilters();
    applyFilters();
    card = document.querySelector(`[data-event-id="${id}"]`);
  }
  if (!card) return;
  const event = state.events.find((item) => Number(item.id) === Number(id));
  const color = (event && CATS[event.cat]?.color) || '#c8a84b';
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => spotlightEventCard(card, color), 320);
}

function initializeHeroIntro() {
  const hero = document.getElementById('hero');
  const intro = document.getElementById('hero-intro');
  const video = document.getElementById('hero-intro-video');
  const retryBtn = document.getElementById('hero-intro-retry');
  const status = document.getElementById('hero-intro-status');
  if (!hero || !intro) return;

  let revealStarted = false;
  let playbackStarted = false;

  const showVideo = () => {
    playbackStarted = true;
    intro.classList.add('has-video');
    intro.classList.remove('video-failed');
    if (status) status.textContent = 'Campus video is playing...';
  };

  const hideVideo = () => {
    playbackStarted = false;
    intro.classList.remove('has-video');
  };

  const finalizeReveal = () => {
    hero.classList.remove('is-revealing', 'intro-active');
    intro.setAttribute('aria-hidden', 'true');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const revealHero = () => {
    if (revealStarted) return;
    revealStarted = true;
    intro.setAttribute('aria-hidden', 'true');
    hero.classList.add('is-revealing');
    window.setTimeout(finalizeReveal, 1200);
  };

  hero.classList.add('intro-active');
  intro.setAttribute('aria-hidden', 'false');

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.addEventListener('playing', showVideo, { once: true });
    video.addEventListener('ended', () => {
      if (status) status.textContent = 'Opening News & Events...';
      window.setTimeout(revealHero, 250);
    }, { once: true });
    video.addEventListener('error', () => {
      hideVideo();
      intro.classList.add('video-failed');
      if (status) status.textContent = 'Video could not be played. Click Retry video.';
    }, { once: true });

    const attemptPlayback = () => {
      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.then(() => {
          if (!playbackStarted) showVideo();
        }).catch(() => {
          hideVideo();
          intro.classList.add('video-failed');
          if (status) status.textContent = 'Browser blocked or could not decode the video.';
        });
      }
    };

    attemptPlayback();
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        intro.classList.remove('video-failed');
        if (status) status.textContent = 'Retrying campus video...';
        video.currentTime = 0;
        attemptPlayback();
      });
    }
  }
}

function renderStats() {
  const stats = state.stats || {
    total: state.events.length,
    upcoming: state.events.filter(isUpcoming).length,
    seminars: state.events.filter((event) => event.cat === 'seminar').length,
    phd: state.events.filter((event) => event.cat === 'phd-defence' || event.cat === 'pre-phd').length,
    news: state.events.filter((event) => ['news', 'hackathon', 'workshop'].includes(event.cat)).length,
  };

  document.getElementById('s-total').textContent = stats.total ?? 0;
  document.getElementById('s-upcoming').textContent = stats.upcoming ?? 0;
  document.getElementById('s-seminars').textContent = stats.seminars ?? 0;
  document.getElementById('s-phd').textContent = stats.phd ?? 0;
  document.getElementById('s-news').textContent = stats.news ?? 0;
}

function renderNextStrip() {
  const upcoming = sortEvents(state.events).filter((event) => isUpcoming(event) && event.date);
  const strip = document.getElementById('next-strip');
  if (!strip) return;

  if (!upcoming.length) {
    strip.style.display = 'none';
    return;
  }

  strip.style.display = '';
  const event = upcoming[0];
  const meta = CATS[event.cat] || CATS.talk;
  strip.style.background = `linear-gradient(90deg, ${meta.color}, ${meta.color}dd)`;
  strip.innerHTML = `
    <span class="next-tag">Next Event</span>
    <div class="next-text">
      <div class="next-title">${escapeHTML(event.title)}</div>
      <div class="next-sub">${escapeHTML(formatDate(event.date))}${event.time ? ` · ${escapeHTML(event.time)}` : ''}${event.venue ? ` · ${escapeHTML(event.venue)}` : ''}</div>
    </div>
    <span class="next-arrow">→</span>
  `;
  strip.onclick = () => openModal(event.id);
}

function getFiltered() {
  const query = state.query.trim().toLowerCase();
  return sortEvents(state.events.filter((event) => {
    if (state.activeCat !== 'all' && event.cat !== state.activeCat) return false;
    if (state.timeFilter === 'upcoming' && !isUpcoming(event)) return false;
    if (state.timeFilter === 'past' && isUpcoming(event)) return false;
    if (!query) return true;

    return [
      event.title,
      event.desc,
      event.abstract,
      event.speaker,
      event.speakerAff,
      event.venue,
      ...(event.tags || []),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }));
}

function renderGrid(events) {
  const container = document.getElementById('grid-container');
  if (!container) return;
  if (!events.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = events.map((event) => {
    const meta = CATS[event.cat] || CATS.talk;
    const upcoming = isUpcoming(event);
    const speakerInitials = initials(event.speaker);
    return `
      <div class="event-card ${upcoming ? 'is-upcoming' : 'is-past'}" data-event-id="${event.id}" onclick="openModal(${event.id})" role="article" aria-label="${escapeHTML(event.title)}">
        <div class="card-accent-bar" style="background:${upcoming ? meta.color : '#5f6673'}"></div>
        <div class="card-body">
          <div class="card-meta">
            ${catBadgeHTML(event.cat)}
            <span class="status-dot ${upcoming ? 'upcoming' : 'past'}"></span>
            <span class="date-text">${escapeHTML(formatDate(event.date))}${event.time ? ` · ${escapeHTML(event.time)}` : ''}</span>
          </div>
          <div class="card-title">${escapeHTML(event.title)}</div>
          <div class="card-desc">${escapeHTML(event.desc || '')}</div>
          ${event.tags && event.tags.length ? `<div class="card-tags">${event.tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>` : ''}
          <div class="card-footer" style="margin-top:auto">
            <div class="speaker-info">
              ${event.speaker ? `<div class="speaker-avatar" style="background:${meta.bg};color:${meta.color}">${escapeHTML(speakerInitials)}</div><span class="speaker-name">${escapeHTML(event.speaker.split(',')[0])}</span>` : `<span class="speaker-name">${escapeHTML(event.venue || '')}</span>`}
            </div>
            <span class="card-cta">${upcoming ? 'Details →' : 'Archive'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderList(events) {
  const container = document.getElementById('list-container');
  if (!container) return;
  if (!events.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = events.map((event) => {
    const upcoming = isUpcoming(event);
    return `
      <div class="list-card ${upcoming ? 'is-upcoming' : 'is-past'}" data-event-id="${event.id}" onclick="openModal(${event.id})" role="article" aria-label="${escapeHTML(event.title)}">
        ${listVisualHTML(event)}
        <div class="list-card-left">
          <div class="list-date-block">
            <div class="list-day">${event.date ? getDay(event.date) : '—'}</div>
            <div class="list-month">${event.date ? getMon(event.date) : ''}</div>
            <div class="list-year">${event.date ? getYear(event.date) : ''}</div>
          </div>
        </div>
        <div class="list-card-mid">
          <div class="list-card-meta">
            ${catBadgeHTML(event.cat)}
            ${upcoming ? '<span style="font-size:11px;color:#16a34a;font-weight:600">● Upcoming</span>' : '<span style="font-size:11px;color:#9ca3af">Past</span>'}
          </div>
          <div class="list-card-title">${escapeHTML(event.title)}</div>
          <div class="list-card-sub">
            ${event.speaker ? `${escapeHTML(event.speaker)}${event.speakerAff ? ` · ${escapeHTML(event.speakerAff.split(',')[0])}` : ''}` : ''}
            ${event.venue ? `${event.speaker ? ' | ' : ''}${escapeHTML(event.venue)}` : ''}
            ${event.time ? ` · ${escapeHTML(event.time)}` : ''}
          </div>
        </div>
        <div class="list-card-right">
          ${upcoming ? `<button class="register-btn" onclick="event.stopPropagation(); addToCalendar(${event.id})">+ Calendar</button>` : ''}
          <span style="font-size:12px;color:#1a3a6b;font-weight:500">Details →</span>
        </div>
      </div>
    `;
  }).join('');
}

function applyFilters() {
  const events = getFiltered();
  const countEl = document.getElementById('result-count');
  const gridEl = document.getElementById('grid-container');
  const listEl = document.getElementById('list-container');
  const emptyEl = document.getElementById('empty-state');

  if (countEl) {
    countEl.textContent = `${events.length} result${events.length !== 1 ? 's' : ''}`;
  }
  if (emptyEl) {
    emptyEl.style.display = events.length ? 'none' : 'block';
  }

  if (state.activeView === 'grid') {
    if (gridEl) gridEl.style.display = 'grid';
    if (listEl) listEl.style.display = 'none';
    renderGrid(events);
    if (listEl) listEl.innerHTML = '';
  } else {
    if (gridEl) gridEl.style.display = 'none';
    if (listEl) listEl.style.display = 'flex';
    renderList(events);
    if (gridEl) gridEl.innerHTML = '';
  }
}

function setCat(el) {
  document.querySelectorAll('.pill').forEach((pill) => pill.classList.remove('active'));
  el.classList.add('active');
  state.activeCat = el.dataset.cat;
  applyFilters();
}

function setView(viewName) {
  state.activeView = viewName;
  const btnGrid = document.getElementById('btn-grid');
  const btnList = document.getElementById('btn-list');
  if (btnGrid) {
    btnGrid.classList.toggle('active', viewName === 'grid');
    btnGrid.setAttribute('aria-pressed', viewName === 'grid' ? 'true' : 'false');
  }
  if (btnList) {
    btnList.classList.toggle('active', viewName === 'list');
    btnList.setAttribute('aria-pressed', viewName === 'list' ? 'true' : 'false');
  }
  applyFilters();
}

function findEventById(id) {
  return state.events.find((event) => Number(event.id) === Number(id));
}

function openModal(id) {
  const event = findEventById(id);
  if (!event) return;

  const meta = CATS[event.cat] || CATS.talk;
  const upcoming = isUpcoming(event);
  document.getElementById('modal-accent').style.background = meta.color;
  document.getElementById('modal-badges').innerHTML = catBadgeHTML(event.cat)
    + (upcoming
      ? '<span style="font-size:12px;color:#16a34a;font-weight:600;margin-left:6px">● Upcoming</span>'
      : '<span style="font-size:12px;color:#9ca3af;margin-left:6px">Past Event</span>');
  document.getElementById('modal-title').textContent = event.title;

  let detailHTML = '<div class="detail-grid">';
  if (event.date) detailHTML += `<div class="detail-item"><div class="detail-label">Date</div><div class="detail-val">${escapeHTML(formatDate(event.date))}${event.time ? ` at ${escapeHTML(event.time)}` : ''}</div></div>`;
  if (event.venue) detailHTML += `<div class="detail-item"><div class="detail-label">Venue</div><div class="detail-val">${escapeHTML(event.venue)}</div></div>`;
  if (event.speaker) detailHTML += `<div class="detail-item"><div class="detail-label">Speaker</div><div class="detail-val">${escapeHTML(event.speaker)}</div></div>`;
  if (event.speakerAff) detailHTML += `<div class="detail-item"><div class="detail-label">Affiliation</div><div class="detail-val">${escapeHTML(event.speakerAff)}</div></div>`;
  detailHTML += '</div>';

  detailHTML += `<div class="abstract-heading">Abstract</div><div class="abstract-text">${escapeHTML(event.abstract || event.desc || '')}</div>`;
  if (event.tags && event.tags.length) {
    detailHTML += `<div class="modal-tags">${event.tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>`;
  }
  detailHTML += '<div class="modal-actions">';
  if (upcoming) detailHTML += `<button class="btn-primary" onclick="addToCalendar(${event.id})">Add to Calendar</button>`;
  if (event.link) detailHTML += `<a href="${escapeHTML(event.link)}" target="_blank" class="btn-primary" style="text-decoration:none">More Info</a>`;
  if (isAuthenticated()) {
    detailHTML += `<button class="btn-outline" onclick="editEvent(${event.id})">Edit</button>`;
    detailHTML += `<button class="btn-danger" onclick="deleteEventAction(${event.id})">Delete</button>`;
  }
  detailHTML += '<button class="btn-outline" onclick="closeModal()">Close</button></div>';

  document.getElementById('modal-body').innerHTML = detailHTML;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function parseTime(value) {
  const [time, ampm] = value.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
}

function addOneHour(value) {
  const [time, ampm] = value.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  hours = (hours + 1) % 24;
  return `${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
}

function addToCalendar(id) {
  const event = findEventById(id);
  if (!event || !event.date) {
    alert('No date information for this event.');
    return;
  }
  const dtStart = event.date.replace(/-/g, '') + (event.time ? `T${parseTime(event.time)}` : '');
  const dtEnd = event.date.replace(/-/g, '') + (event.time ? `T${addOneHour(event.time)}` : '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCIS UoH//Events//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.abstract || event.desc || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.venue || 'SCIS, University of Hyderabad'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.ics';
  anchor.click();
  URL.revokeObjectURL(url);
}

function updateAuthUI() {
  const authStatus = document.getElementById('auth-status');
  const authButton = document.getElementById('nav-auth-btn');
  const addButton = document.querySelector('.nav-add-btn');

  if (isAuthenticated()) {
    if (authStatus) authStatus.textContent = `${authState.user.name} · ${authState.user.role}`;
    if (authButton) authButton.textContent = 'Logout';
    if (addButton) {
      addButton.textContent = '+ Add Event';
      addButton.style.display = 'inline-flex';
    }
  } else {
    if (authStatus) authStatus.textContent = 'Visitor mode';
    if (authButton) authButton.textContent = 'Admin Login';
    if (addButton) {
      addButton.textContent = '+ Add Event';
      addButton.style.display = 'none';
    }
  }
}

function saveAuth() {
  if (authState.token && authState.user) {
    localStorage.setItem('scisAuthToken', authState.token);
    localStorage.setItem('scisAuthUser', JSON.stringify(authState.user));
  } else {
    localStorage.removeItem('scisAuthToken');
    localStorage.removeItem('scisAuthUser');
  }
}

function toggleAuthAction() {
  if (isAuthenticated()) {
    logout();
    return;
  }
  openLoginModal();
}

function logout(options = {}) {
  authState.token = '';
  authState.user = null;
  saveAuth();
  updateAuthUI();
  if (!options.silent) {
    alert('Logged out successfully.');
  }
}

function openLoginModal() {
  document.getElementById('login-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.textContent = '';
}

function closeLoginModal() {
  document.getElementById('login-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  const form = document.getElementById('login-form');
  if (form) form.reset();
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.textContent = '';
}

async function submitLogin(event) {
  event.preventDefault();
  const form = event.target;
  const errorEl = document.getElementById('login-error');

  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: form.username.value.trim(),
        password: form.password.value,
      },
    });
    authState.token = result.token;
    authState.user = result.user;
    saveAuth();
    updateAuthUI();
    closeLoginModal();
    alert('Login successful.');

    if (state.postLoginAction === 'open-add') {
      state.postLoginAction = null;
      openAddModal();
    }
  } catch (error) {
    if (errorEl) errorEl.textContent = error.message;
  }
}

function populateEventForm(event) {
  const form = document.getElementById('add-event-form');
  if (!form) return;
  form.title.value = event?.title || '';
  form.cat.value = event?.cat || 'seminar';
  form.date.value = event?.date || '';
  form.time.value = event?.time || '';
  form.venue.value = event?.venue || '';
  form.speaker.value = event?.speaker || '';
  form.speakerAff.value = event?.speakerAff || '';
  form.desc.value = event?.desc || '';
  form.abstract.value = event?.abstract || '';
  form.tags.value = (event?.tags || []).join(', ');
  form.link.value = event?.link || '';
  form.image.value = event?.image || '';
}

function openAddModal() {
  if (!isAuthenticated()) {
    state.postLoginAction = 'open-add';
    openLoginModal();
    return;
  }

  state.postLoginAction = null;
  state.editingId = null;
  document.getElementById('add-modal-title').textContent = 'Add New Event';
  const submitButton = document.querySelector('#add-event-form button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Add Event';
  populateEventForm(null);
  document.getElementById('add-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAddModal() {
  document.getElementById('add-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  const form = document.getElementById('add-event-form');
  if (form) form.reset();
  state.editingId = null;
}

function editEvent(id) {
  const event = findEventById(id);
  if (!event) return;
  closeModal();
  state.editingId = id;
  document.getElementById('add-modal-title').textContent = 'Edit Event';
  const submitButton = document.querySelector('#add-event-form button[type="submit"]');
  if (submitButton) submitButton.textContent = 'Save Changes';
  populateEventForm(event);
  document.getElementById('add-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

async function deleteEventAction(id) {
  const event = findEventById(id);
  if (!event) return;
  const confirmed = window.confirm(`Delete "${event.title}"?`);
  if (!confirmed) return;

  try {
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
    closeModal();
    await refreshData();
    alert('Event deleted successfully.');
  } catch (error) {
    alert(error.message);
  }
}

async function submitAddEvent(event) {
  event.preventDefault();
  const form = event.target;
  const wasEditing = Boolean(state.editingId);

  const payload = {
    cat: form.cat.value,
    title: form.title.value.trim(),
    date: form.date.value,
    time: form.time.value.trim(),
    venue: form.venue.value.trim(),
    speaker: form.speaker.value.trim(),
    speakerAff: form.speakerAff.value.trim(),
    desc: form.desc.value.trim(),
    abstract: (form.abstract.value || form.desc.value).trim(),
    tags: form.tags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
    link: form.link.value.trim(),
    image: form.image.value.trim(),
  };

  try {
    if (state.editingId) {
      await apiFetch(`/api/events/${state.editingId}`, {
        method: 'PUT',
        body: payload,
      });
    } else {
      await apiFetch('/api/events', {
        method: 'POST',
        body: payload,
      });
    }

    closeAddModal();
    await refreshData();
    alert(wasEditing ? 'Event updated successfully.' : 'Event added successfully.');
  } catch (error) {
    alert(error.message);
  }
}

async function refreshData() {
  await loadEvents();
  renderTicker();
  renderStats();
  renderNextStrip();
  applyFilters();
}

function bindStaticListeners() {
  const searchEl = document.getElementById('search-input');
  const timeEl = document.getElementById('time-filter');
  const modalOverlay = document.getElementById('modal-overlay');
  const addOverlay = document.getElementById('add-modal-overlay');
  const loginOverlay = document.getElementById('login-modal-overlay');

  if (searchEl) {
    searchEl.addEventListener('input', (event) => {
      state.query = event.target.value;
      applyFilters();
    });
  }

  if (timeEl) {
    timeEl.addEventListener('change', (event) => {
      state.timeFilter = event.target.value;
      applyFilters();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) closeModal();
    });
  }

  if (addOverlay) {
    addOverlay.addEventListener('click', (event) => {
      if (event.target === addOverlay) closeAddModal();
    });
  }

  if (loginOverlay) {
    loginOverlay.addEventListener('click', (event) => {
      if (event.target === loginOverlay) closeLoginModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeAddModal();
      closeLoginModal();
    }
  });
}

async function init() {
  bindStaticListeners();
  initializeHeroIntro();
  updateAuthUI();

  try {
    await refreshData();
  } catch (error) {
    console.error(error);
    const strip = document.getElementById('next-strip');
    if (strip) {
      strip.textContent = 'Could not load events. Start the backend server and refresh.';
      strip.style.background = 'linear-gradient(90deg, #8b1e3f, #b45309)';
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
