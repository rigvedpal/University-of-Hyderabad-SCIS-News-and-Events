function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isUpcoming(event) {
  if (!event.date) return false;
  return new Date(`${event.date}T00:00:00`) >= startOfToday();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function normalizeEventPayload(payload = {}) {
  return {
    cat: String(payload.cat || '').trim(),
    title: String(payload.title || '').trim(),
    date: String(payload.date || '').trim(),
    time: String(payload.time || '').trim(),
    venue: String(payload.venue || '').trim(),
    speaker: String(payload.speaker || '').trim(),
    speakerAff: String(payload.speakerAff || '').trim(),
    image: String(payload.image || '').trim(),
    desc: String(payload.desc || '').trim(),
    abstract: String(payload.abstract || payload.desc || '').trim(),
    tags: normalizeTags(payload.tags),
    link: String(payload.link || '').trim(),
  };
}

function validateEventPayload(event) {
  const requiredFields = ['cat', 'title', 'date', 'desc'];
  const missing = requiredFields.filter((field) => !event[field]);
  if (missing.length) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
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

function filterEvents(events, query = {}) {
  const q = String(query.q || '').trim().toLowerCase();
  const cat = String(query.cat || 'all').trim();
  const time = String(query.time || 'all').trim();

  return sortEvents(events.filter((event) => {
    if (cat !== 'all' && event.cat !== cat) return false;
    if (time === 'upcoming' && !isUpcoming(event)) return false;
    if (time === 'past' && isUpcoming(event)) return false;
    if (!q) return true;
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
      .some((value) => String(value).toLowerCase().includes(q));
  }));
}

function buildStats(events) {
  return {
    total: events.length,
    upcoming: events.filter(isUpcoming).length,
    seminars: events.filter((event) => event.cat === 'seminar').length,
    phd: events.filter((event) => event.cat === 'phd-defence' || event.cat === 'pre-phd').length,
    news: events.filter((event) => ['news', 'hackathon', 'workshop'].includes(event.cat)).length,
  };
}

function buildTags(events) {
  const counts = new Map();
  for (const event of events) {
    for (const tag of event.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

module.exports = {
  isUpcoming,
  normalizeEventPayload,
  validateEventPayload,
  sortEvents,
  filterEvents,
  buildStats,
  buildTags,
};
