const fs = require('fs/promises');
const path = require('path');
const { DB_PATH } = require('../config');

async function ensureDatabase() {
  const dirPath = path.dirname(DB_PATH);
  await fs.mkdir(dirPath, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await writeDatabase({ users: [], events: [] });
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

async function readEvents() {
  const db = await readDatabase();
  return Array.isArray(db.events) ? db.events : [];
}

async function writeEvents(events) {
  const db = await readDatabase();
  db.events = events;
  await writeDatabase(db);
  return events;
}

async function getUserByUsername(username) {
  const db = await readDatabase();
  return (db.users || []).find((user) => user.username === username) || null;
}

async function createEvent(eventInput) {
  const events = await readEvents();
  const nextId = events.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
  const event = {
    ...eventInput,
    id: nextId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  events.unshift(event);
  await writeEvents(events);
  return event;
}

async function updateEvent(id, updates) {
  const events = await readEvents();
  const index = events.findIndex((event) => Number(event.id) === Number(id));
  if (index === -1) return null;
  events[index] = {
    ...events[index],
    ...updates,
    id: Number(id),
    updatedAt: new Date().toISOString(),
  };
  await writeEvents(events);
  return events[index];
}

async function deleteEvent(id) {
  const events = await readEvents();
  const index = events.findIndex((event) => Number(event.id) === Number(id));
  if (index === -1) return false;
  events.splice(index, 1);
  await writeEvents(events);
  return true;
}

module.exports = {
  ensureDatabase,
  readDatabase,
  writeDatabase,
  readEvents,
  writeEvents,
  getUserByUsername,
  createEvent,
  updateEvent,
  deleteEvent,
};
