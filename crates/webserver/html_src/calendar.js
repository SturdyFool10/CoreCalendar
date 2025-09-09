// Calendar App - Vanilla JavaScript Implementation
class CalendarApp {
  constructor() {
    this.currentDate = new Date();
    this.currentView = "day";
    this.events = this.loadEvents();
    this.calendars = {
      personal: { name: "Personal", color: "#007bff" },
      work: { name: "Work", color: "#28a745" },
      family: { name: "Family", color: "#dc3545" },
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTimeSlots();
    this.initializeFormDefaults();
    this.updateDateDisplay();
    this.renderCurrentView();
    this.updateCurrentTimeLine();
    this.updateEventPastFutureStyles();

    // Update current time line and event styles every 500ms (2 times per second)
    setInterval(() => {
      this.updateCurrentTimeLine();
      this.updateEventPastFutureStyles();
    }, 500);

    // Update current time line and event styles on viewport resize
    window.addEventListener("resize", () => {
      this.updateCurrentTimeLine();
      this.updateEventPastFutureStyles();
    });
  }

  setupEventListeners() {
    // Menu toggle
    document.getElementById("menu-btn").addEventListener("click", () => this.toggleMenu());

    // View switching
    document.querySelectorAll(".view-btn").forEach((button) => {
      button.addEventListener("click", (e) => this.switchView(e.target.id.replace("-view", "")));
    });

    // Date navigation
    document.getElementById("prev-btn").addEventListener("click", () => this.navigateDate(-1));
    document.getElementById("next-btn").addEventListener("click", () => this.navigateDate(1));

    document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme());

    // Menu sections
    document.querySelectorAll(".section-toggle").forEach((button) => {
      button.addEventListener("click", (e) => this.toggleSection(e.currentTarget));
    });

    // Event form
    document.getElementById("event-form").addEventListener("submit", (e) => this.createEvent(e));

    document.getElementById("event-recurring").addEventListener("change", (e) => this.toggleRecurringOptions(e.target.checked));
    document.getElementById("recurrence-type").addEventListener("change", (e) => this.toggleCustomRecurrence(e.target.value === "custom"));
    document.getElementById("limit-recurrences").addEventListener("change", (e) => this.toggleRecurrenceCount(e.target.checked));

    document.getElementById("use-duration").addEventListener("change", (e) => this.toggleDurationMode(e.target.checked));

    // Duration calculation
    document.getElementById("duration-hours").addEventListener("input", () => this.calculateEndTime());
    document.getElementById("duration-minutes").addEventListener("input", () => this.calculateEndTime());

    // File upload
    document.getElementById("browse-btn").addEventListener("click", () => document.getElementById("file-input").click());
    document.getElementById("file-input").addEventListener("change", (e) => this.handleFileSelect(e.target.files));

    // Drag and drop
    const dropZone = document.getElementById("drop-zone");
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      this.handleFileSelect(e.dataTransfer.files);
    });

    document.getElementById("import-btn").addEventListener("click", () => this.importEvents());

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("side-menu");
      const menuBtn = document.getElementById("menu-btn");
      if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
        this.closeMenu();
      }
    });
  }

  initializeFormDefaults() {
    // Populate calendar dropdowns
    this.populateCalendarDropdowns();

    // Ensure all dropdowns default to placeholder options
    document.getElementById("event-calendar").selectedIndex = 0;
    document.getElementById("recurrence-type").selectedIndex = 0;
    document.getElementById("import-calendar").selectedIndex = 0;

    // Ensure all checkboxes are unchecked
    document.getElementById("use-duration").checked = false;
    document.getElementById("event-recurring").checked = false;
    document.getElementById("limit-recurrences").checked = false;

    // Ensure recurring options are hidden
    document.getElementById("recurring-options").style.display = "none";
    document.getElementById("custom-recurrence").style.display = "none";
    document.getElementById("recurrence-count-section").style.display = "none";
  }

  populateCalendarDropdowns() {
    const eventCalendarSelect = document.getElementById("event-calendar");
    const importCalendarSelect = document.getElementById("import-calendar");

    // Clear existing options except placeholder
    eventCalendarSelect.innerHTML = '<option value="" disabled selected>Make a selection</option>';
    importCalendarSelect.innerHTML = '<option value="" disabled selected>Make a selection</option>';

    // Add calendar options from the calendars object
    Object.keys(this.calendars).forEach((calendarKey) => {
      const calendar = this.calendars[calendarKey];

      // Create option for event calendar dropdown
      const eventOption = document.createElement("option");
      eventOption.value = calendarKey;
      eventOption.textContent = calendar.name;
      eventOption.style.paddingLeft = "1.5rem";
      eventOption.style.position = "relative";
      eventOption.style.background = `radial-gradient(circle at 0.5rem center, ${calendar.color} 0.3rem, transparent 0.3rem)`;
      eventOption.style.backgroundRepeat = "no-repeat";
      eventCalendarSelect.appendChild(eventOption);

      // Create option for import calendar dropdown
      const importOption = document.createElement("option");
      importOption.value = calendarKey;
      importOption.textContent = calendar.name;
      importOption.style.paddingLeft = "1.5rem";
      importOption.style.position = "relative";
      importOption.style.background = `radial-gradient(circle at 0.5rem center, ${calendar.color} 0.3rem, transparent 0.3rem)`;
      importOption.style.backgroundRepeat = "no-repeat";
      importCalendarSelect.appendChild(importOption);
    });
  }

  setupTimeSlots() {
    const timeColumn = document.querySelector(".view-container.active .time-column");

    if (timeColumn) {
      timeColumn.innerHTML = "";

      for (let hour = 0; hour < 24; hour++) {
        const timeLabel = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;

        const timeSlot = document.createElement("div");
        timeSlot.className = "time-slot";
        timeSlot.textContent = timeLabel;
        timeColumn.appendChild(timeSlot);
      }
    }

    // Setup day grid if in day view
    const dayGrid = document.querySelector(".day-grid");
    if (dayGrid) {
      dayGrid.innerHTML = "";
      for (let hour = 0; hour < 24; hour++) {
        const hourSlot = document.createElement("div");
        hourSlot.className = "hour-slot";
        hourSlot.dataset.hour = hour;
        dayGrid.appendChild(hourSlot);
      }
    }
  }

  toggleMenu() {
    document.getElementById("side-menu").classList.toggle("open");
  }

  closeMenu() {
    document.getElementById("side-menu").classList.remove("open");
  }

  switchView(view) {
    this.currentView = view;
    document.querySelectorAll(".view-btn").forEach((button) => {
      button.classList.remove("active");
    });
    document.getElementById(`${view}-view`).classList.add("active");

    document.querySelectorAll(".view-container").forEach((container) => {
      container.classList.remove("active");
    });
    document.getElementById(`${view}-view-container`).classList.add("active");

    this.updateDateDisplay();
    this.renderCurrentView();
  }

  navigateDate(direction) {
    const date = new Date(this.currentDate);

    switch (this.currentView) {
      case "day":
        date.setDate(date.getDate() + direction);
        break;
      case "week":
        date.setDate(date.getDate() + direction * 7);
        break;
      case "month":
        date.setMonth(date.getMonth() + direction);
        break;
    }

    this.currentDate = date;
    this.updateDateDisplay();
    this.renderCurrentView();
  }

  updateDateDisplay() {
    const options = { year: "numeric", month: "long" };
    let displayText = "";

    switch (this.currentView) {
      case "day":
        displayText = this.currentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        break;
      case "week":
        const weekStart = this.getWeekStart(this.currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        displayText = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        break;
      case "month":
        displayText = this.currentDate.toLocaleDateString("en-US", options);
        break;
    }

    document.getElementById("current-date").textContent = displayText;
  }

  renderCurrentView() {
    switch (this.currentView) {
      case "day":
        this.renderDayView();
        break;
      case "week":
        this.renderWeekView();
        break;
      case "month":
        this.renderMonthView();
        break;
    }

    this.updateCurrentTimeLine();
  }

  renderDayView() {
    this.renderEventsForDay(this.currentDate, document.querySelector(".day-grid"));
  }

  renderWeekView() {
    // Set up the time column
    this.setupTimeSlots();

    const weekDays = document.querySelector(".week-days");
    weekDays.innerHTML = "";

    const weekStart = this.getWeekStart(this.currentDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayDate = date.getDate();

      const dayColumn = document.createElement("div");
      dayColumn.className = "week-day";

      const weekDayHeader = document.createElement("div");
      weekDayHeader.className = "week-day-header";

      const dayNameElement = document.createElement("div");
      dayNameElement.className = "day-name";
      dayNameElement.textContent = dayName;
      weekDayHeader.appendChild(dayNameElement);

      const dayDateElement = document.createElement("div");
      dayDateElement.className = "day-date";
      dayDateElement.textContent = dayDate;
      weekDayHeader.appendChild(dayDateElement);

      dayColumn.appendChild(weekDayHeader);

      const weekDayGrid = document.createElement("div");
      weekDayGrid.className = "week-day-grid";

      for (let hour = 0; hour < 24; hour++) {
        const hourSlot = document.createElement("div");
        hourSlot.className = "hour-slot";
        hourSlot.dataset.hour = hour;
        weekDayGrid.appendChild(hourSlot);
      }

      dayColumn.appendChild(weekDayGrid);
      weekDays.appendChild(dayColumn);
      this.renderEventsForWeekDay(date, weekDayGrid);
    }
  }

  renderMonthView() {
    const monthHeader = document.querySelector(".month-header");
    const monthGrid = document.querySelector(".month-grid");

    // Setup day names
    monthHeader.innerHTML = "";
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach((name) => {
      const dayNameElement = document.createElement("div");
      dayNameElement.className = "month-day-name";
      dayNameElement.textContent = name;
      monthHeader.appendChild(dayNameElement);
    });

    // Setup calendar grid
    monthGrid.innerHTML = "";

    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();

    for (let week = 0; week < 6; week++) {
      // Only render the last week if it contains at least one day in the selected month
      let weekHasCurrentMonthDay = false;
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);
        if (date.getMonth() === this.currentDate.getMonth()) {
          weekHasCurrentMonthDay = true;
          break;
        }
      }
      // If this is the last week (week === 5) and it has no days in the current month, skip rendering it
      if (week === 5 && !weekHasCurrentMonthDay) {
        continue;
      }

      const weekRow = document.createElement("div");
      weekRow.className = "month-week";

      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);

        const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
        const isToday = date.toDateString() === today.toDateString();

        const dayCell = document.createElement("div");
        dayCell.className = `month-day ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""}`;

        const dayNumberElement = document.createElement("div");
        dayNumberElement.className = "month-day-number";
        dayNumberElement.textContent = date.getDate();
        dayCell.appendChild(dayNumberElement);

        this.renderEventsForMonthDay(date, dayCell);
        weekRow.appendChild(dayCell);
      }

      monthGrid.appendChild(weekRow);
    }
  }

  renderEventsForDay(date, container) {
    container.querySelectorAll(".event").forEach((event) => {
      event.remove();
    });

    const dayEvents = this.getEventsForDate(date);
    const now = new Date();

    // Group events by time conflicts
    const eventGroups = this.groupConflictingEvents(dayEvents);

    eventGroups.forEach((group) => {
      const groupWidth = group.length;

      group.forEach((event, index) => {
        const calendar = this.calendars[event.calendar];
        if (!calendar) {
          // Skip events with invalid or missing calendar
          return;
        }
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60); // minutes

        // Calculate position based on viewport height for day view
        const totalMinutesInDay = 24 * 60;
        const eventMinutes = startHour * 60 + startMinute;
        const availableHeight = window.innerHeight - 64; // toolbar height
        const top = (eventMinutes / totalMinutesInDay) * availableHeight;
        const height = Math.max((duration / totalMinutesInDay) * availableHeight, 20); // minimum height

        const isPast = eventEnd < now;
        const backgroundColor = isPast ? "transparent" : calendar.color;
        const borderColor = calendar.color;
        const textColor = isPast ? calendar.color : "white";

        const eventElement = document.createElement("div");
        eventElement.className = `event ${isPast ? "past" : "future"}`;
        eventElement.style.top = `${top}px`;
        eventElement.style.height = `${height}px`;
        eventElement.style.backgroundColor = backgroundColor;
        eventElement.style.borderColor = borderColor;
        eventElement.style.color = textColor;

        // Only split horizontal space if there are overlapping events
        if (groupWidth > 1) {
          const widthPerEvent = 100 / groupWidth;
          const leftPosition = widthPerEvent * index;
          const padding = 0.5; // rem padding between events

          eventElement.style.left = `calc(${leftPosition}% + ${padding * index}rem)`;
          eventElement.style.width = `calc(${widthPerEvent}% - ${padding}rem)`;
        } else {
          eventElement.style.left = "0";
          eventElement.style.width = "100%";
          eventElement.style.right = "0";
        }
        // Add data attributes for real-time style updates
        eventElement.setAttribute("data-start", eventStart.toISOString());
        eventElement.setAttribute("data-end", eventEnd.toISOString());
        eventElement.setAttribute("data-color", calendar.color);

        const eventTitleElement = document.createElement("div");
        eventTitleElement.className = "event-title";
        eventTitleElement.textContent = event.title;
        eventElement.appendChild(eventTitleElement);

        const eventTimeElement = document.createElement("div");
        eventTimeElement.className = "event-time";
        eventTimeElement.textContent = `${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}`;
        eventElement.appendChild(eventTimeElement);

        container.appendChild(eventElement);
      });
    });
  }

  renderEventsForMonthDay(date, dayCell) {
    const dayEvents = this.getEventsForDate(date);

    const now = new Date();
    dayEvents.forEach((event) => {
      // Show all events per day, skip if calendar is invalid
      const calendar = this.calendars[event.calendar];
      if (!calendar) return;
      const eventElement = document.createElement("div");
      eventElement.className = "month-event";
      const eventEnd = new Date(event.endDate);
      const isPast = eventEnd < now;
      if (isPast) {
        eventElement.style.backgroundColor = "transparent";
        eventElement.style.border = `2px solid ${calendar.color}`;
        eventElement.style.color = calendar.color;
      } else {
        eventElement.style.backgroundColor = calendar.color;
        eventElement.style.border = "none";
        eventElement.style.color = "white";
      }
      eventElement.textContent = event.title;
      dayCell.appendChild(eventElement);
    });

    if (dayEvents.length > 3) {
      const moreElement = document.createElement("div");
      moreElement.className = "month-event-more";
      moreElement.textContent = `+${dayEvents.length - 3} more`;
      dayCell.appendChild(moreElement);
    }
  }

  getEventsForDate(date) {
    const dateStr = date.toDateString();
    return this.events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === dateStr;
    });
  }

  groupConflictingEvents(events) {
    const groups = [];

    events.forEach((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // Find existing group that conflicts with this event
      let foundGroup = null;

      for (const group of groups) {
        const hasConflict = group.some((groupEvent) => {
          const groupStart = new Date(groupEvent.startDate);
          const groupEnd = new Date(groupEvent.endDate);

          // Check if events overlap
          return eventStart < groupEnd && eventEnd > groupStart;
        });

        if (hasConflict) {
          foundGroup = group;
          break;
        }
      }

      if (foundGroup) {
        foundGroup.push(event);
      } else {
        groups.push([event]);
      }
    });

    return groups;
  }

  renderEventsForWeekDay(date, container) {
    container.querySelectorAll(".event").forEach((event) => {
      event.remove();
    });

    const dayEvents = this.getEventsForDate(date);
    const now = new Date();

    // Group events by time conflicts
    const eventGroups = this.groupConflictingEvents(dayEvents);

    eventGroups.forEach((group) => {
      const groupWidth = group.length;

      group.forEach((event, index) => {
        const calendar = this.calendars[event.calendar];
        if (!calendar) {
          // Skip events with invalid or missing calendar
          return;
        }
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);

        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60); // minutes

        // Calculate position based on viewport height for week view
        const totalMinutesInDay = 24 * 60;
        const eventMinutes = startHour * 60 + startMinute;
        const availableHeight = window.innerHeight - 64 - 60; // toolbar + header
        const top = (eventMinutes / totalMinutesInDay) * availableHeight;
        const height = Math.max((duration / totalMinutesInDay) * availableHeight, 20); // minimum height

        const isPast = eventEnd < now;
        const backgroundColor = isPast ? "transparent" : calendar.color;
        const borderColor = calendar.color;
        const textColor = isPast ? calendar.color : "white";

        const eventElement = document.createElement("div");
        eventElement.className = `event ${isPast ? "past" : "future"}`;
        eventElement.style.top = `${top}px`;
        eventElement.style.height = `${height}px`;
        eventElement.style.backgroundColor = backgroundColor;
        eventElement.style.borderColor = borderColor;
        eventElement.style.color = textColor;

        // Only split horizontal space if there are overlapping events
        if (groupWidth > 1) {
          const widthPerEvent = 100 / groupWidth;
          const leftPosition = widthPerEvent * index;
          const padding = 0.5; // rem padding between events

          eventElement.style.left = `calc(${leftPosition}% + ${padding * index}rem)`;
          eventElement.style.width = `calc(${widthPerEvent}% - ${padding}rem)`;
        } else {
          eventElement.style.left = "0";
          eventElement.style.width = "100%";
          eventElement.style.right = "0";
        }
        // Add data attributes for real-time style updates
        eventElement.setAttribute("data-start", eventStart.toISOString());
        eventElement.setAttribute("data-end", eventEnd.toISOString());
        eventElement.setAttribute("data-color", calendar.color);

        const eventTitleElement = document.createElement("div");
        eventTitleElement.className = "event-title";
        eventTitleElement.textContent = event.title;
        eventElement.appendChild(eventTitleElement);

        const eventTimeElement = document.createElement("div");
        eventTimeElement.className = "event-time";
        eventTimeElement.textContent = `${this.formatTime(eventStart)} - ${this.formatTime(eventEnd)}`;
        eventElement.appendChild(eventTimeElement);
        container.appendChild(eventElement);
      });
    });
  }

  // Updates the outline/background of all visible events in day/week view in real time
  updateEventPastFutureStyles() {
    const now = new Date();

    // Day view
    if (this.currentView === "day") {
      document.querySelectorAll("#day-view-container .event").forEach((eventEl) => {
        const start = eventEl.getAttribute("data-start");
        const end = eventEl.getAttribute("data-end");
        if (!end) return;
        const eventEnd = new Date(end);
        const isPast = eventEnd < now;
        if (isPast && !eventEl.classList.contains("past")) {
          eventEl.classList.remove("future");
          eventEl.classList.add("past");
          eventEl.style.backgroundColor = "transparent";
          eventEl.style.color = eventEl.getAttribute("data-color") || "#000";
        } else if (!isPast && !eventEl.classList.contains("future")) {
          eventEl.classList.remove("past");
          eventEl.classList.add("future");
          eventEl.style.backgroundColor = eventEl.getAttribute("data-color") || "#000";
          eventEl.style.color = "white";
        }
      });
    }

    // Week view
    if (this.currentView === "week") {
      document.querySelectorAll("#week-view-container .event").forEach((eventEl) => {
        const start = eventEl.getAttribute("data-start");
        const end = eventEl.getAttribute("data-end");
        if (!end) return;
        const eventEnd = new Date(end);
        const isPast = eventEnd < now;
        if (isPast && !eventEl.classList.contains("past")) {
          eventEl.classList.remove("future");
          eventEl.classList.add("past");
          eventEl.style.backgroundColor = "transparent";
          eventEl.style.color = eventEl.getAttribute("data-color") || "#000";
        } else if (!isPast && !eventEl.classList.contains("future")) {
          eventEl.classList.remove("past");
          eventEl.classList.add("future");
          eventEl.style.backgroundColor = eventEl.getAttribute("data-color") || "#000";
          eventEl.style.color = "white";
        }
      });
    }
  }

  updateCurrentTimeLine() {
    const now = new Date();

    if (this.currentView === "day") {
      const isToday = now.toDateString() === this.currentDate.toDateString();
      const timeLine = document.querySelector(".current-time-line");

      if (isToday) {
        const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const totalMinutesInDay = 24 * 60;
        const availableHeight = window.innerHeight - 64; // 4rem toolbar in pixels
        const position = (minutes / totalMinutesInDay) * availableHeight;
        timeLine.style.top = `${position}px`;
        timeLine.style.display = "block";
      } else {
        timeLine.style.display = "none";
      }
    }

    if (this.currentView === "week") {
      const weekStart = this.getWeekStart(this.currentDate);

      document.querySelectorAll(".week-day").forEach((dayElement, index) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + index);

        let timeLine = dayElement.querySelector(".current-time-line");
        if (!timeLine) {
          timeLine = document.createElement("div");
          timeLine.className = "current-time-line";
          dayElement.querySelector(".week-day-grid").appendChild(timeLine);
        }

        if (dayDate.toDateString() === now.toDateString()) {
          const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
          const totalMinutesInDay = 24 * 60;
          const availableHeight = window.innerHeight - 64 - 60; // 4rem toolbar + 3.75rem header in pixels
          const position = (minutes / totalMinutesInDay) * availableHeight;
          timeLine.style.top = `${position}px`;
          timeLine.style.display = "block";
        } else {
          timeLine.style.display = "none";
        }
      });
    }
  }

  getWeekStart(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  toggleTheme() {
    const app = document.getElementById("app");
    if (app.classList.contains("theme-light")) {
      app.classList.remove("theme-light");
      app.classList.add("theme-dark");
      localStorage.setItem("calendar-theme", "dark");
    } else {
      app.classList.remove("theme-dark");
      app.classList.add("theme-light");
      localStorage.setItem("calendar-theme", "light");
    }
  }

  toggleSection(button) {
    const target = button.dataset.target;
    const content = document.getElementById(target);
    const arrow = button.querySelector(".arrow");

    button.classList.toggle("active");
    content.classList.toggle("open");

    if (content.classList.contains("open")) {
      content.style.display = "block";
    } else {
      content.style.display = "none";
    }
  }

  toggleRecurringOptions(show) {
    const recurringOptions = document.getElementById("recurring-options");
    if (show) {
      recurringOptions.style.display = "block";
    } else {
      recurringOptions.style.display = "none";
      // Reset custom recurrence when hiding
      document.getElementById("custom-recurrence").style.display = "none";
      document.getElementById("recurrence-count-section").style.display = "none";
    }
  }

  toggleCustomRecurrence(show) {
    const customRecurrence = document.getElementById("custom-recurrence");
    customRecurrence.style.display = show ? "block" : "none";
  }

  toggleRecurrenceCount(show) {
    const recurrenceCountSection = document.getElementById("recurrence-count-section");
    recurrenceCountSection.style.display = show ? "block" : "none";
  }

  toggleDurationMode(useDuration) {
    const endTimeSection = document.getElementById("end-time-section");
    const durationSection = document.getElementById("duration-section");

    if (useDuration) {
      endTimeSection.style.display = "none";
      durationSection.style.display = "block";
    } else {
      endTimeSection.style.display = "flex";
      durationSection.style.display = "none";
    }
  }

  calculateEndTime() {
    const startDate = document.getElementById("event-start-date").value;
    const startTime = document.getElementById("event-start-time").value;
    const hours = Number.parseInt(document.getElementById("duration-hours").value) || 0;
    const minutes = Number.parseInt(document.getElementById("duration-minutes").value) || 0;

    if (startDate && startTime && (hours || minutes)) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(start.getTime() + (hours * 60 + minutes) * 60000);

      document.getElementById("event-end-date").value = end.toISOString().split("T")[0];
      document.getElementById("event-end-time").value = end.toTimeString().slice(0, 5);
    }
  }

  createEvent(e) {
    e.preventDefault();

    const calendarValue = document.getElementById("event-calendar").value;
    if (!calendarValue || !(calendarValue in this.calendars)) {
      alert("Please select a valid calendar before creating an event.");
      return;
    }

    const formData = new FormData(e.target);
    const event = {
      id: Date.now().toString(),
      calendar: calendarValue,
      title: document.getElementById("event-title").value,
      description: document.getElementById("event-description").value,
      location: document.getElementById("event-location").value,
      startDate: new Date(`${document.getElementById("event-start-date").value}T${document.getElementById("event-start-time").value}`),
      endDate: new Date(`${document.getElementById("event-end-date").value}T${document.getElementById("event-end-time").value}`),
      recurring: document.getElementById("event-recurring").checked,
      recurrenceType: document.getElementById("recurrence-type").value,
      recurrenceCount: document.getElementById("limit-recurrences").checked ? Number.parseInt(document.getElementById("recurrence-count").value) : null,
    };

    this.events.push(event);
    this.saveEvents();
    this.renderCurrentView();

    // Reset form
    document.getElementById("event-form").reset();

    // Use the same initialization logic to ensure consistent defaults
    this.initializeFormDefaults();

    alert("Event created successfully!");
  }

  handleFileSelect(files) {
    if (files.length > 0) {
      const file = files[0];
      document.querySelector("#drop-zone p").textContent = `Selected: ${file.name}`;
    }
  }

  importEvents() {
    // Placeholder for import functionality
    alert("Import functionality would be implemented here");
  }

  loadEvents() {
    const saved = localStorage.getItem("calendar-events");
    if (saved) {
      return JSON.parse(saved).map((event) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
      }));
    }

    // Sample events for demonstration
    return [
      {
        id: "1",
        calendar: "personal",
        title: "Morning Workout",
        description: "Gym session",
        location: "Local Gym",
        startDate: new Date(2025, 0, 9, 7, 0),
        endDate: new Date(2025, 0, 9, 8, 30),
        recurring: false,
      },
      {
        id: "2",
        calendar: "work",
        title: "Team Meeting",
        description: "Weekly standup",
        location: "Conference Room A",
        startDate: new Date(2025, 0, 9, 10, 0),
        endDate: new Date(2025, 0, 9, 11, 0),
        recurring: true,
        recurrenceType: "weekly",
      },
    ];
  }

  saveEvents() {
    localStorage.setItem("calendar-events", JSON.stringify(this.events));
  }

  formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

// Initialize the calendar app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  const savedTheme = localStorage.getItem("calendar-theme") || "light";
  document.getElementById("app").classList.add(`theme-${savedTheme}`);

  // Initialize the app
  new CalendarApp();
});
