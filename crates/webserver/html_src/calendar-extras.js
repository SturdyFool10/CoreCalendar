/**
 * calendar-extras.js
 * Handles timezone dropdown population, deduped IANA timezone logic, and all-day event UI logic.
 */

// --- Deduped IANA Timezone Logic ---
const PREFERENCE_ORDER = [
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Toronto",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Montevideo",
  "America/Asuncion",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Warsaw",
  "Europe/Athens",
  "Europe/Bucharest",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Riyadh",
  "Asia/Tehran",
  "Asia/Jerusalem",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Casablanca",
  "Asia/Kabul",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Yangon",
  "Asia/Bangkok",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Tongatapu",
  "Etc/UTC",
  "UTC",
  "Etc/GMT",
];
const FALLBACK_TIMEZONES = ["Etc/UTC", "Etc/GMT", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Phoenix", "America/Denver", "America/Chicago", "America/New_York", "America/Mexico_City", "America/Bogota", "America/Lima", "America/Caracas", "America/Santiago", "America/Sao_Paulo", "Europe/London", "Europe/Dublin", "Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Rome", "Europe/Warsaw", "Europe/Athens", "Europe/Bucharest", "Europe/Helsinki", "Europe/Istanbul", "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi", "Africa/Casablanca", "Asia/Dubai", "Asia/Qatar", "Asia/Riyadh", "Asia/Tehran", "Asia/Jerusalem", "Asia/Kabul", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Yangon", "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Taipei", "Asia/Tokyo", "Asia/Seoul", "Australia/Perth", "Australia/Adelaide", "Australia/Sydney", "Pacific/Auckland", "Pacific/Fiji", "Pacific/Tongatapu"];
function tzOffsetMinutes(timeZone, date) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}
function buildSignature(timeZone, year = new Date().getUTCFullYear()) {
  const stamps = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(year, m, 1, 0, 0, 0));
    stamps.push(tzOffsetMinutes(timeZone, d));
  }
  return stamps.join(",");
}
function dedupeBySignature(zones, year = new Date().getUTCFullYear()) {
  const groups = new Map();
  for (const tz of zones) {
    try {
      const sig = buildSignature(tz, year);
      if (!groups.has(sig)) groups.set(sig, new Set());
      groups.get(sig).add(tz);
    } catch {}
  }
  return groups;
}
function chooseRepresentatives(groups) {
  const preferredIndex = new Map(PREFERENCE_ORDER.map((tz, i) => [tz, i]));
  const reps = [];
  for (const set of groups.values()) {
    const candidates = Array.from(set);
    candidates.sort((a, b) => {
      const ai = preferredIndex.has(a) ? preferredIndex.get(a) : Infinity;
      const bi = preferredIndex.has(b) ? preferredIndex.get(b) : Infinity;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b);
    });
    reps.push(candidates[0]);
  }
  reps.sort((a, b) => a.localeCompare(b));
  return reps;
}
function getAllTimeZones() {
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      const list = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(list) && list.length) return list;
    } catch {}
  }
  return FALLBACK_TIMEZONES;
}
function getUniqueTimeZones(options = {}) {
  const { year = new Date().getUTCFullYear() } = options;
  const zones = getAllTimeZones();
  const groups = dedupeBySignature(zones, year);
  return chooseRepresentatives(groups);
}
function detectUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
function populateTimezoneDropdown() {
  const IANATimezones = getUniqueTimeZones();
  // Event form
  const tzSelect = document.getElementById("event-timezone");
  if (tzSelect) {
    tzSelect.innerHTML = "";
    IANATimezones.forEach((tz) => {
      const opt = document.createElement("option");
      opt.value = tz;
      opt.textContent = tz;
      tzSelect.appendChild(opt);
    });
    const detected = detectUserTimezone();
    tzSelect.value = IANATimezones.includes(detected) ? detected : "UTC";
  }
  // Desktop view
  const viewTzSelect = document.getElementById("view-timezone");
  if (viewTzSelect) {
    viewTzSelect.innerHTML = "";
    IANATimezones.forEach((tz) => {
      const opt = document.createElement("option");
      opt.value = tz;
      opt.textContent = tz;
      viewTzSelect.appendChild(opt);
    });
    const detected = detectUserTimezone();
    viewTzSelect.value = IANATimezones.includes(detected) ? detected : "UTC";
  }
  // Mobile/side menu
  const sideTzSelect = document.getElementById("side-view-timezone");
  if (sideTzSelect) {
    sideTzSelect.innerHTML = "";
    IANATimezones.forEach((tz) => {
      const opt = document.createElement("option");
      opt.value = tz;
      opt.textContent = tz;
      sideTzSelect.appendChild(opt);
    });
    const detected = detectUserTimezone();
    sideTzSelect.value = IANATimezones.includes(detected) ? detected : "UTC";
  }
}
document.addEventListener("DOMContentLoaded", populateTimezoneDropdown);

// --- All Day Event Logic ---
document.addEventListener("DOMContentLoaded", function () {
  const allDayCheckbox = document.getElementById("event-all-day");
  if (!allDayCheckbox) return;

  // Save which fields were originally required
  document.querySelectorAll(".all-day-hide input[required]").forEach((input) => {
    input.dataset.wasRequired = "true";
  });

  function updateAllDayFields() {
    const isAllDay = allDayCheckbox.checked;
    document.querySelectorAll(".all-day-hide").forEach((el) => {
      el.style.display = isAllDay ? "none" : "";
      // Remove required attribute if hiding
      el.querySelectorAll("input[required]").forEach((input) => {
        if (isAllDay) {
          input.dataset.wasRequired = "true";
          input.required = false;
        } else if (input.dataset.wasRequired === "true") {
          input.required = true;
        }
      });
    });
    // Hide only the hours input in custom recurrence if all day
    const customHours = document.getElementById("custom-hours");
    if (customHours) {
      customHours.style.display = isAllDay ? "none" : "";
      if (isAllDay) {
        customHours.required = false;
      } else if (customHours.dataset.wasRequired === "true") {
        customHours.required = true;
      }
    }
    // Always show custom recurrence option, just hide hours input
    const customOption = document.querySelector("#recurrence-type option[value='custom']");
    if (customOption) customOption.style.display = "";
  }
  allDayCheckbox.addEventListener("change", updateAllDayFields);
  updateAllDayFields();
});

// --- Mobile/desktop view control sync ---
function syncViewControls() {
  // Mobile view controls
  const sideDay = document.getElementById("side-day-view");
  const sideWeek = document.getElementById("side-week-view");
  const sideMonth = document.getElementById("side-month-view");
  // Desktop view controls
  const day = document.getElementById("day-view");
  const week = document.getElementById("week-view");
  const month = document.getElementById("month-view");
  if (sideDay && day) {
    sideDay.onclick = () => day.click();
    day.onclick = () => sideDay.classList.add("active");
  }
  if (sideWeek && week) {
    sideWeek.onclick = () => week.click();
    week.onclick = () => sideWeek.classList.add("active");
  }
  if (sideMonth && month) {
    sideMonth.onclick = () => month.click();
    month.onclick = () => sideMonth.classList.add("active");
  }
}
document.addEventListener("DOMContentLoaded", syncViewControls);

// --- Timezone dropdown sync (desktop <-> mobile) ---
function syncTimezoneDropdowns() {
  const desktopTz = document.getElementById("view-timezone");
  const sideTz = document.getElementById("side-view-timezone");
  function sync(from, to) {
    if (from && to) {
      to.value = from.value;
    }
  }
  if (desktopTz && sideTz) {
    desktopTz.addEventListener("change", () => sync(desktopTz, sideTz));
    sideTz.addEventListener("change", () => sync(sideTz, desktopTz));
  }
}
document.addEventListener("DOMContentLoaded", syncTimezoneDropdowns);

// JS to hide .mobile-only elements on desktop and show on mobile
function updateMobileOnlyVisibility() {
  const isMobile = window.matchMedia("(max-width: 48rem)").matches;
  document.querySelectorAll(".mobile-only").forEach((el) => {
    el.style.display = isMobile ? "block" : "none";
  });
}
window.addEventListener("resize", updateMobileOnlyVisibility);
document.addEventListener("DOMContentLoaded", updateMobileOnlyVisibility);
