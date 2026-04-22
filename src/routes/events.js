const express = require('express');
const {
  readEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../lib/db');
const {
  normalizeEventPayload,
  validateEventPayload,
  sortEvents,
  filterEvents,
  buildStats,
  buildTags,
} = require('../lib/events');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const events = await readEvents();
    res.json(sortEvents(events));
  } catch (error) {
    next(error);
  }
});

router.get('/filter', async (req, res, next) => {
  try {
    const events = await readEvents();
    res.json(filterEvents(events, req.query));
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const events = await readEvents();
    res.json(buildStats(events));
  } catch (error) {
    next(error);
  }
});

router.get('/tags', async (_req, res, next) => {
  try {
    const events = await readEvents();
    res.json(buildTags(events));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const events = await readEvents();
    const event = events.find((item) => Number(item.id) === Number(req.params.id));
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.json(event);
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const eventPayload = normalizeEventPayload(req.body);
    const validationMessage = validateEventPayload(eventPayload);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }
    const event = await createEvent(eventPayload);
    return res.status(201).json(event);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const eventPayload = normalizeEventPayload(req.body);
    const validationMessage = validateEventPayload(eventPayload);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }
    const event = await updateEvent(req.params.id, eventPayload);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.json(event);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const deleted = await deleteEvent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
