const { sql, getPool } = require("../config/db");

const DEFAULT_COVER_IMAGE = "uploads\\default.jpg";
const CHAT_SEARCHABLE_STATUSES = ["active", "upcoming"];
const DESTINATION_SLUG_SEARCH_TERMS = {
  "con-dao": "Côn Đảo",
  "da-lat": "Đà Lạt",
  "da-nang": "Đà Nẵng",
  "ha-long": "Hạ Long",
  "ha-noi": "Hà Nội",
  "hoi-an": "Hội An",
  hue: "Huế",
  "nha-trang": "Nha Trang",
  "phu-quoc": "Phú Quốc",
  "phu-yen": "Phú Yên",
  "quy-nhon": "Quy Nhơn",
  "sa-pa": "Sa Pa",
  sapa: "Sa Pa",
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return trimmedValue;
    }

    const ddMmYyyyMatch = trimmedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddMmYyyyMatch) {
      const [, day, month, year] = ddMmYyyyMatch;
      return `${year}-${month}-${day}`;
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  return null;
};

const parseCurrencyValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const sanitizedValue = value.replace(/[^\d.,-]/g, "");
  if (!sanitizedValue) {
    return null;
  }

  let normalizedValue = sanitizedValue;
  const hasComma = normalizedValue.includes(",");
  const hasDot = normalizedValue.includes(".");

  if (hasComma && hasDot) {
    normalizedValue =
      normalizedValue.lastIndexOf(",") > normalizedValue.lastIndexOf(".")
        ? normalizedValue.replace(/\./g, "").replace(",", ".")
        : normalizedValue.replace(/,/g, "");
  } else if (hasComma) {
    const commaCount = (normalizedValue.match(/,/g) || []).length;
    normalizedValue =
      commaCount === 1 && normalizedValue.split(",")[1].length <= 2
        ? normalizedValue.replace(",", ".")
        : normalizedValue.replace(/,/g, "");
  } else if (hasDot) {
    const dotCount = (normalizedValue.match(/\./g) || []).length;
    normalizedValue =
      dotCount > 1 ? normalizedValue.replace(/\./g, "") : normalizedValue;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const escapeLikePattern = (value) =>
  value.replace(/[\\%_[\]]/g, "\\$&");

const resolveLocationSearchTerm = (entities = {}) => {
  const explicitLocation = firstNonEmpty(entities.location);

  if (explicitLocation) {
    return explicitLocation;
  }

  const normalizedDestination = firstNonEmpty(entities.destination_normalized);

  if (!normalizedDestination) {
    return null;
  }

  return (
    DESTINATION_SLUG_SEARCH_TERMS[normalizedDestination.toLowerCase()] ||
    normalizedDestination
  );
};

const normalizeChatEntities = (rawEntities = {}) => {
  const location = firstNonEmpty(
    rawEntities.location,
    rawEntities.destination,
    rawEntities.destination_name
  );
  const destinationNormalized = firstNonEmpty(
    rawEntities.destination_normalized,
    rawEntities.destinationNormalized,
    rawEntities.location_normalized
  );

  let dateStart = parseDateValue(
    firstNonEmpty(
      rawEntities.date_start,
      rawEntities.start_date,
      rawEntities.date,
      rawEntities.time
    )
  );
  let dateEnd = parseDateValue(
    firstNonEmpty(rawEntities.date_end, rawEntities.end_date)
  );

  const rawPriceMin = firstNonEmpty(rawEntities.price_min, rawEntities.min_price);
  const rawPriceMax = firstNonEmpty(rawEntities.price_max, rawEntities.max_price);
  let priceMin = parseCurrencyValue(rawPriceMin);
  let priceMax = parseCurrencyValue(rawPriceMax);

  if (priceMin === null && priceMax === null) {
    priceMax = parseCurrencyValue(rawEntities.price);
  }

  if (dateStart && dateEnd && dateStart > dateEnd) {
    [dateStart, dateEnd] = [dateEnd, dateStart];
  }

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  const normalizedEntities = {};

  if (location) {
    normalizedEntities.location = location;
  }

  if (destinationNormalized) {
    normalizedEntities.destination_normalized = destinationNormalized;
  }

  if (dateStart) {
    normalizedEntities.date_start = dateStart;
  }

  if (dateEnd) {
    normalizedEntities.date_end = dateEnd;
  }

  if (priceMin !== null) {
    normalizedEntities.price_min = priceMin;
  }

  if (priceMax !== null) {
    normalizedEntities.price_max = priceMax;
  }

  return normalizedEntities;
};

const hasChatSearchFilters = (entities = {}) =>
  Boolean(
    entities.location ||
      entities.destination_normalized ||
      entities.date_start ||
      entities.date_end ||
      entities.price_min !== undefined ||
      entities.price_max !== undefined
  );

const buildChatTourSearchQuery = (rawEntities = {}) => {
  const entities = normalizeChatEntities(rawEntities);
  const filters = [
    "t.status IN (@statusActive, @statusUpcoming)",
    "tp.age_group = @ageGroup",
  ];
  const params = [
    { name: "statusActive", type: sql.NVarChar, value: CHAT_SEARCHABLE_STATUSES[0] },
    {
      name: "statusUpcoming",
      type: sql.NVarChar,
      value: CHAT_SEARCHABLE_STATUSES[1],
    },
    { name: "ageGroup", type: sql.NVarChar, value: "adultPrice" },
  ];

  const locationTerm = resolveLocationSearchTerm(entities);

  if (locationTerm) {
    filters.push(
      "(t.destination LIKE @locationPattern ESCAPE '\\' OR t.name LIKE @locationPattern ESCAPE '\\')"
    );
    params.push({
      name: "locationPattern",
      type: sql.NVarChar,
      value: `%${escapeLikePattern(locationTerm)}%`,
    });
  }

  if (entities.date_start) {
    filters.push("t.start_date >= @dateStart");
    params.push({
      name: "dateStart",
      type: sql.Date,
      value: entities.date_start,
    });
  }

  if (entities.date_end) {
    filters.push("t.start_date <= @dateEnd");
    params.push({
      name: "dateEnd",
      type: sql.Date,
      value: entities.date_end,
    });
  }

  if (entities.price_min !== undefined) {
    filters.push("tp.price >= @priceMin");
    params.push({
      name: "priceMin",
      type: sql.Decimal(15, 2),
      value: entities.price_min,
    });
  }

  if (entities.price_max !== undefined) {
    filters.push("tp.price <= @priceMax");
    params.push({
      name: "priceMax",
      type: sql.Decimal(15, 2),
      value: entities.price_max,
    });
  }

  const query = `
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
      tp.price,
      (
        SELECT TOP 1 image_url
        FROM Tour_image ti
        WHERE ti.tour_id = t.tour_id
        ORDER BY image_id ASC
      ) AS cover_image,
      ISNULL((
        SELECT SUM(bd.quantity)
        FROM Booking b
        INNER JOIN Booking_Detail bd
          ON b.booking_id = bd.booking_id
        WHERE b.tour_id = t.tour_id
          AND b.status = 'confirmed'
      ), 0) AS booked_slots
    FROM Tour AS t
    INNER JOIN Tour_Price AS tp
      ON t.tour_id = tp.tour_id
    WHERE ${filters.join("\n      AND ")}
    ORDER BY t.start_date ASC, tp.price ASC, t.created_at DESC
  `;

  return {
    entities,
    params,
    query,
    hasSearchFilters: hasChatSearchFilters(entities),
  };
};

const mapChatSearchTour = (row) => {
  const maxGuests = row.max_guests || 0;
  const bookedSlots = row.booked_slots || 0;

  return {
    tour_id: row.tour_id,
    branch_id: row.branch_id,
    name: row.name,
    destination: row.destination,
    departure_location: row.departure_location,
    departureLocation: row.departure_location,
    start_date: row.start_date,
    end_date: row.end_date,
    duration: row.duration,
    max_guests: row.max_guests,
    booked_slots: bookedSlots,
    available_seats: maxGuests - bookedSlots,
    transport: row.transport || "Không xác định",
    description: row.description,
    created_at: row.created_at,
    status: row.status,
    price: row.price,
    prices: row.price,
    cover_image: row.cover_image || DEFAULT_COVER_IMAGE,
  };
};

const searchToursByChatEntities = async (
  rawEntities = {},
  { poolGetter = getPool } = {}
) => {
  const searchPlan = buildChatTourSearchQuery(rawEntities);

  if (!searchPlan.hasSearchFilters) {
    return {
      ...searchPlan,
      queryExecuted: false,
      tourlist: [],
    };
  }

  let pool;
  try {
    pool = await poolGetter();
  } catch (dbErr) {
    // MSSQL unavailable — return empty tourlist, keep entities from Python.
    // AI chatbot response is still valid; DB is non-critical for chat flow.
    return {
      ...searchPlan,
      queryExecuted: false,
      tourlist: [],
    };
  }

  try {
    const request = pool.request();

    searchPlan.params.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(searchPlan.query);

    return {
      ...searchPlan,
      queryExecuted: true,
      tourlist: result.recordset.map(mapChatSearchTour),
    };
  } catch (queryErr) {
    return {
      ...searchPlan,
      queryExecuted: false,
      tourlist: [],
    };
  }
};

module.exports = {
  CHAT_SEARCHABLE_STATUSES,
  DEFAULT_COVER_IMAGE,
  normalizeChatEntities,
  hasChatSearchFilters,
  buildChatTourSearchQuery,
  mapChatSearchTour,
  searchToursByChatEntities,
};
