/**
 * Internal Tool Routes
 *
 * Secure endpoints called by the Python AI Agent as typed tools.
 * All routes require INTERNAL_SERVICE_TOKEN via Bearer auth.
 *
 * Mounted at /internal/tools in server.js.
 */
const express = require("express");
const router = express.Router();

const { internalServiceAuth } = require("../middlewares/internalServiceAuth");
const {
  buildChatTourSearchQuery,
  mapChatSearchTour,
  normalizeChatEntities,
} = require("../services/chatTourSearchService");
const { sql, getPool } = require("../config/db");

router.use(internalServiceAuth);

/**
 * GET /internal/tools/search-tours
 *
 * Tool: search_tours
 *
 * Query params:
 *   location                  — destination name (e.g. "Đà Lạt")
 *   destination_normalized   — slug (e.g. "da-lat")
 *   date_start               — ISO date YYYY-MM-DD
 *   date_end                 — ISO date YYYY-MM-DD
 *   price_min                — numeric
 *   price_max                — numeric
 *   people_count             — integer (currently informational only)
 *   limit                    — max tours to return (default 5, max 20)
 *
 * Response shape:
 *   {
 *     status: "success" | "no_results" | "error",
 *     tool: "search_tours",
 *     input: { ... sanitized params ... },
 *     total: number,
 *     tours: [...],
 *     search_metadata: { has_filters, location, date_start, date_end, price_min, price_max }
 *   }
 */
router.get("/search-tours", async (req, res) => {
  const {
    location,
    destination_normalized,
    date_start,
    date_end,
    price_min,
    price_max,
    people_count,
    limit: limitStr,
  } = req.query;

  const limit = Math.min(parseInt(limitStr, 10) || 5, 20);

  const sanitizedInput = {
    location: typeof location === "string" ? location.trim() : undefined,
    destination_normalized:
      typeof destination_normalized === "string"
        ? destination_normalized.trim()
        : undefined,
    date_start: typeof date_start === "string" ? date_start.trim() : undefined,
    date_end: typeof date_end === "string" ? date_end.trim() : undefined,
    price_min:
      price_min !== undefined && price_min !== "" ? Number(price_min) : undefined,
    price_max:
      price_max !== undefined && price_max !== "" ? Number(price_max) : undefined,
    people_count:
      people_count !== undefined && people_count !== ""
        ? parseInt(people_count, 10)
        : undefined,
    limit,
  };

  const rawEntities = {};
  if (sanitizedInput.location) rawEntities.location = sanitizedInput.location;
  if (sanitizedInput.destination_normalized)
    rawEntities.destination_normalized = sanitizedInput.destination_normalized;
  if (sanitizedInput.date_start) rawEntities.date_start = sanitizedInput.date_start;
  if (sanitizedInput.date_end) rawEntities.date_end = sanitizedInput.date_end;
  if (sanitizedInput.price_min !== undefined)
    rawEntities.price_min = sanitizedInput.price_min;
  if (sanitizedInput.price_max !== undefined)
    rawEntities.price_max = sanitizedInput.price_max;

  let pool;
  try {
    pool = await getPool();
  } catch (dbErr) {
    return res.status(200).json({
      status: "error",
      tool: "search_tours",
      input: sanitizedInput,
      total: 0,
      tours: [],
      search_metadata: {
        has_filters: Object.keys(rawEntities).length > 0,
        location: sanitizedInput.location || sanitizedInput.destination_normalized || null,
        date_start: sanitizedInput.date_start || null,
        date_end: sanitizedInput.date_end || null,
        price_min: sanitizedInput.price_min || null,
        price_max: sanitizedInput.price_max || null,
      },
    });
  }

  try {
    const searchPlan = buildChatTourSearchQuery(rawEntities);

    if (!searchPlan.hasSearchFilters) {
      return res.status(200).json({
        status: "no_results",
        tool: "search_tours",
        input: sanitizedInput,
        total: 0,
        tours: [],
        search_metadata: {
          has_filters: false,
          location: null,
          date_start: null,
          date_end: null,
          price_min: null,
          price_max: null,
        },
      });
    }

    const request = pool.request();
    searchPlan.params.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(searchPlan.query + ` OPTION (maxrecursion 0)`);
    const tours = result.recordset
      .slice(0, limit)
      .map(mapChatSearchTour);

    return res.status(200).json({
      status: tours.length > 0 ? "success" : "no_results",
      tool: "search_tours",
      input: sanitizedInput,
      total: result.recordset.length,
      tours,
      search_metadata: {
        has_filters: true,
        location: sanitizedInput.location || sanitizedInput.destination_normalized || null,
        date_start: sanitizedInput.date_start || null,
        date_end: sanitizedInput.date_end || null,
        price_min: sanitizedInput.price_min || null,
        price_max: sanitizedInput.price_max || null,
      },
    });
  } catch (queryErr) {
    return res.status(200).json({
      status: "error",
      tool: "search_tours",
      input: sanitizedInput,
      total: 0,
      tours: [],
      search_metadata: null,
    });
  }
});

/**
 * GET /internal/tools/tour/:tour_id
 *
 * Tool: get_tour_detail
 *
 * Path param: tour_id
 *
 * Returns tour card, schedule list, and price tiers.
 * All fields are read-only and safe to expose to the AI agent.
 * Admin-only / payment data is not included.
 *
 * Response shape:
 *   {
 *     status: "success" | "not_found" | "error",
 *     tool: "get_tour_detail",
 *     tour: { ... },
 *     schedules: [...],
 *     prices: [...]
 *   }
 */
router.get("/tour/:tour_id", async (req, res) => {
  const { tour_id } = req.params;

  if (!tour_id || typeof tour_id !== "string" || tour_id.length > 50) {
    return res.status(200).json({
      status: "error",
      tool: "get_tour_detail",
      tour: null,
      schedules: [],
      prices: [],
    });
  }

  let pool;
  try {
    pool = await getPool();
  } catch (dbErr) {
    return res.status(200).json({
      status: "error",
      tool: "get_tour_detail",
      tour: null,
      schedules: [],
      prices: [],
    });
  }

  try {
    const tourResult = await pool
      .request()
      .input("tourId", sql.VarChar, tour_id)
      .query(`
        SELECT
          t.tour_id,
          t.branch_id,
          t.name,
          t.destination,
          t.departure_location,
          t.start_date,
          t.end_date,
          t.duration,
          t.max_guests,
          t.transport,
          t.description,
          t.created_at,
          t.status,
          (
            SELECT TOP 1 image_url
            FROM Tour_image ti
            WHERE ti.tour_id = t.tour_id
            ORDER BY image_id ASC
          ) AS cover_image
        FROM Tour t
        WHERE t.tour_id = @tourId
      `);

    if (!tourResult.recordset || tourResult.recordset.length === 0) {
      return res.status(200).json({
        status: "not_found",
        tool: "get_tour_detail",
        tour: null,
        schedules: [],
        prices: [],
      });
    }

    const tour = tourResult.recordset[0];
    const [scheduleResult, priceResult] = await Promise.all([
      pool
        .request()
        .input("tourId", sql.VarChar, tour_id)
        .query(`
          SELECT schedule_id, tour_id, day_number, description, meals
          FROM Tour_Schedule
          WHERE tour_id = @tourId
          ORDER BY day_number ASC
        `),
      pool
        .request()
        .input("tourId", sql.VarChar, tour_id)
        .query(`
          SELECT price_id, tour_id, age_group, price
          FROM Tour_Price
          WHERE tour_id = @tourId
          ORDER BY age_group ASC
        `),
    ]);

    return res.status(200).json({
      status: "success",
      tool: "get_tour_detail",
      tour: {
        tour_id: tour.tour_id,
        branch_id: tour.branch_id,
        name: tour.name,
        destination: tour.destination,
        departure_location: tour.departure_location,
        start_date: tour.start_date,
        end_date: tour.end_date,
        duration: tour.duration,
        max_guests: tour.max_guests,
        transport: tour.transport,
        description: tour.description,
        created_at: tour.created_at,
        status: tour.status,
        cover_image: tour.cover_image || null,
      },
      schedules: (scheduleResult.recordset || []).map((s) => ({
        schedule_id: s.schedule_id,
        tour_id: s.tour_id,
        day_number: s.day_number,
        description: s.description,
        meals: s.meals,
      })),
      prices: (priceResult.recordset || []).map((p) => ({
        price_id: p.price_id,
        tour_id: p.tour_id,
        age_group: p.age_group,
        price: p.price,
      })),
    });
  } catch (queryErr) {
    return res.status(200).json({
      status: "error",
      tool: "get_tour_detail",
      tour: null,
      schedules: [],
      prices: [],
    });
  }
});

module.exports = router;
