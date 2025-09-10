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

    // Availability Check UI setup
    this.setupAvailabilityCheckUI();

    // Update current time line every 500ms (2 times per second)
    setInterval(() => this.updateCurrentTimeLine(), 500);

    // Update current time line and re-render events on viewport resize
    window.addEventListener("resize", () => {
      this.updateCurrentTimeLine();
      this.renderCurrentView();
    });

    // Listen for timezone changes in week/month view
    const viewTzSelect = document.getElementById("view-timezone");
    if (viewTzSelect) {
      viewTzSelect.addEventListener("change", () => {
        this.renderCurrentView();
      });
    }
  }

  setupEventListeners() {
    // Menu toggle
    document.getElementById("menu-btn").addEventListener("click", () => this.toggleMenu());

    // View switching
    document.querySelectorAll(".view-btn").forEach((button) => {
      button.addEventListener("click", (e) => this.switchView(e.target.id.replace("-view", "")));
    });

    // Date navigation (desktop)
    document.getElementById("prev-btn").addEventListener("click", () => this.navigateDate(-1));
    document.getElementById("next-btn").addEventListener("click", () => this.navigateDate(1));

    // Date navigation (mobile/side menu)
    const sidePrevBtn = document.getElementById("side-prev-btn");
    const sideNextBtn = document.getElementById("side-next-btn");
    if (sidePrevBtn) sidePrevBtn.addEventListener("click", () => this.navigateDate(-1));
    if (sideNextBtn) sideNextBtn.addEventListener("click", () => this.navigateDate(1));

    // Date picker sync (desktop and mobile)
    const datePicker = document.getElementById("date-picker");
    const sideDatePicker = document.getElementById("side-date-picker");
    if (datePicker && sideDatePicker) {
      datePicker.addEventListener("change", (e) => {
        sideDatePicker.value = e.target.value;
        datePicker.dispatchEvent(new Event("input")); // trigger any listeners
      });
      sideDatePicker.addEventListener("change", (e) => {
        datePicker.value = e.target.value;
        sideDatePicker.dispatchEvent(new Event("input")); // trigger any listeners
      });
    }

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
    const recurrenceType = document.getElementById("recurrence-type");
    if (recurrenceType) recurrenceType.selectedIndex = 0;
    // Custom selects for event-calendar and import-calendar are handled in populateCalendarDropdowns

    // Ensure all checkboxes are unchecked
    document.getElementById("use-duration").checked = false;
    document.getElementById("event-recurring").checked = false;
    document.getElementById("limit-recurrences").checked = false;

    // Ensure recurring options are hidden
    document.getElementById("recurring-options").style.display = "none";
    document.getElementById("custom-recurrence").style.display = "none";
    document.getElementById("recurrence-count-section").style.display = "none";
  }

  // --- Availability Check UI logic ---
  setupAvailabilityCheckUI() {
    // Section toggle for Availability Check
    const sectionToggle = document.querySelector('.section-toggle[data-target="availability-check"]');
    const sectionContent = document.getElementById("availability-check");
    if (sectionToggle && sectionContent) {
      sectionToggle.addEventListener("click", () => {
        const isOpen = sectionContent.style.display === "" || sectionContent.style.display === "block";
        sectionContent.style.display = isOpen ? "none" : "block";
        sectionToggle.classList.toggle("active", !isOpen);
      });
    }

    // Tool switching
    const toolSelect = document.getElementById("availability-tool-select");
    const conflictUI = document.getElementById("conflict-checker-ui");
    const slotUI = document.getElementById("find-free-slot-ui");
    if (toolSelect && conflictUI && slotUI) {
      toolSelect.addEventListener("change", (e) => {
        if (e.target.value === "conflict-checker") {
          conflictUI.style.display = "";
          slotUI.style.display = "none";
        } else {
          conflictUI.style.display = "none";
          slotUI.style.display = "";
        }
      });
      // Set initial state
      if (toolSelect.value === "conflict-checker") {
        conflictUI.style.display = "";
        slotUI.style.display = "none";
      } else {
        conflictUI.style.display = "none";
        slotUI.style.display = "";
      }
    }

    // Render dynamic calendar checkboxes and dropdowns
    this.renderCalendarCheckboxes("conflict");
    this.renderCalendarCheckboxes("slot");

    // Setup calendar checkbox logic for both tools
    this.setupCalendarCheckboxes("conflict");
    this.setupCalendarCheckboxes("slot");

    // Criteria builder for Find Free Time Slot
    this.criteriaRules = [];
    this.renderCriteriaBuilder();

    // Add Criteria button
    const addCriteriaBtn = document.getElementById("add-criteria-btn");
    if (addCriteriaBtn) {
      addCriteriaBtn.addEventListener("click", () => {
        this.criteriaRules.push({
          operator: "AND",
          type: "TimeRule",
          comparator: "within",
          value: { earliest: "", latest: "" },
        });
        this.renderCriteriaBuilder();
      });
    }

    // Conflict checker toggles logic
    // All-day toggle
    const allDayCheckbox = document.getElementById("conflict-all-day");
    const allDayHideEls = document.querySelectorAll("#conflict-checker-ui .all-day-hide");
    const timezoneGroup = document.getElementById("conflict-timezone-group");
    if (allDayCheckbox) {
      function updateAllDayFields() {
        const isAllDay = allDayCheckbox.checked;
        allDayHideEls.forEach((el) => {
          el.style.display = isAllDay ? "none" : "";
        });
        if (timezoneGroup) {
          timezoneGroup.style.display = isAllDay ? "none" : "";
        }
      }
      allDayCheckbox.addEventListener("change", updateAllDayFields);
      updateAllDayFields();
    }

    // Use duration toggle
    const useDurationCheckbox = document.getElementById("conflict-use-duration");
    const endTimeSection = document.getElementById("conflict-end-time-section");
    const durationSection = document.getElementById("conflict-duration-section");
    if (useDurationCheckbox && endTimeSection && durationSection) {
      function updateDurationMode() {
        const useDuration = useDurationCheckbox.checked;
        endTimeSection.style.display = useDuration ? "none" : "";
        durationSection.style.display = useDuration ? "" : "none";
      }
      useDurationCheckbox.addEventListener("change", updateDurationMode);
      updateDurationMode();
    }
  }

  renderCriteriaBuilder() {
    const builder = document.getElementById("criteria-builder");
    if (!builder) return;
    builder.innerHTML = "";
    if (!this.criteriaRules) this.criteriaRules = [];
    this.criteriaRules.forEach((rule, idx) => {
      const row = document.createElement("div");
      row.className = "criteria-row";
      row.style.display = "block";
      row.style.border = "1px solid var(--border-color, #ccc)";
      row.style.borderRadius = "0.5em";
      row.style.padding = "0.5em";
      row.style.marginBottom = "0.5em";
      row.style.background = "var(--bg-tertiary, #f8f9fa)";

      // First line: Operator and Type
      const line1 = document.createElement("div");
      line1.style.display = "flex";
      line1.style.gap = "0.5em";
      line1.style.marginBottom = "0.25em";
      // Operator (hide for first row)
      let opSel = null;
      if (idx !== 0) {
        opSel = document.createElement("select");
        opSel.style.width = "70px";
        opSel.style.minWidth = "60px";
        opSel.style.maxWidth = "80px";
        opSel.style.height = "2.2em";
        opSel.style.lineHeight = "2.2em";
        opSel.style.overflow = "hidden";
        opSel.style.verticalAlign = "middle";
        ["AND", "OR", "NOT"].forEach((op) => {
          const opt = document.createElement("option");
          opt.value = op;
          opt.textContent = op;
          if (rule.operator === op) opt.selected = true;
          opSel.appendChild(opt);
        });
        opSel.addEventListener("change", (e) => {
          this.criteriaRules[idx].operator = e.target.value;
        });
      }
      // Type
      const typeSel = document.createElement("select");
      typeSel.style.width = "120px";
      typeSel.style.minWidth = "90px";
      typeSel.style.maxWidth = "140px";
      typeSel.style.height = "2.2em";
      typeSel.style.lineHeight = "2.2em";
      typeSel.style.overflow = "hidden";
      typeSel.style.verticalAlign = "middle";
      ["DateRange", "TimeRule", "Tag", "Calendar", "Custom"].forEach((type) => {
        const opt = document.createElement("option");
        if (type === "DateRange") {
          opt.value = type;
          opt.textContent = "Date Range";
        } else if (type === "TimeRule") {
          opt.value = type;
          opt.textContent = "Time Window";
        } else {
          opt.value = type;
          opt.textContent = type;
        }
        if (rule.type === type) opt.selected = true;
        typeSel.appendChild(opt);
      });
      typeSel.addEventListener("change", (e) => {
        this.criteriaRules[idx].type = e.target.value;
        // Reset value for new type
        if (e.target.value === "TimeRule") {
          this.criteriaRules[idx].value = { earliest: "", latest: "" };
        } else if (e.target.value === "DateRange") {
          this.criteriaRules[idx].value = { start: "", end: "" };
        } else {
          this.criteriaRules[idx].value = "";
        }
        this.renderCriteriaBuilder();
      });
      if (opSel) line1.appendChild(opSel);
      line1.appendChild(typeSel);

      // Comparator
      // Second line: Comparator and Value
      const line2 = document.createElement("div");
      line2.style.display = "flex";
      line2.style.gap = "0.5em";
      line2.style.marginBottom = "0.25em";
      let compSel;
      if (rule.type === "TimeRule") {
        compSel = document.createElement("select");
        compSel.style.width = "70px";
        compSel.style.minWidth = "60px";
        compSel.style.maxWidth = "80px";
        compSel.style.height = "2.2em";
        compSel.style.lineHeight = "2.2em";
        compSel.style.overflow = "hidden";
        compSel.style.verticalAlign = "middle";
        ["within"].forEach((comp) => {
          const opt = document.createElement("option");
          opt.value = comp;
          opt.textContent = "within";
          compSel.appendChild(opt);
        });
        compSel.value = "within";
        compSel.disabled = true;
      } else {
        compSel = document.createElement("select");
        compSel.style.width = "70px";
        compSel.style.minWidth = "60px";
        compSel.style.maxWidth = "80px";
        compSel.style.height = "2.2em";
        compSel.style.lineHeight = "2.2em";
        compSel.style.overflow = "hidden";
        compSel.style.verticalAlign = "middle";
        ["=", "≠"].forEach((comp) => {
          const opt = document.createElement("option");
          opt.value = comp;
          opt.textContent = comp;
          if (rule.comparator === comp) opt.selected = true;
          compSel.appendChild(opt);
        });
        compSel.addEventListener("change", (e) => {
          this.criteriaRules[idx].comparator = e.target.value;
        });
      }

      // Value (input or dropdown based on type)
      let valueInput;
      if (rule.type === "TimeRule") {
        valueInput = document.createElement("div");
        valueInput.style.display = "flex";
        valueInput.style.gap = "0.5em";
        valueInput.style.alignItems = "center";
        valueInput.style.flexWrap = "wrap";
        valueInput.style.width = "100%";
        const earliest = document.createElement("input");
        earliest.type = "time";
        earliest.placeholder = "Earliest Start";
        earliest.value = rule.value.earliest || "";
        earliest.style.marginRight = "0.25em";
        earliest.addEventListener("input", (e) => {
          this.criteriaRules[idx].value.earliest = e.target.value;
        });
        const latest = document.createElement("input");
        latest.type = "time";
        latest.placeholder = "Latest End";
        latest.value = rule.value.latest || "";
        latest.style.marginLeft = "0.25em";
        latest.addEventListener("input", (e) => {
          this.criteriaRules[idx].value.latest = e.target.value;
        });
        valueInput.appendChild(document.createTextNode("Earliest:"));
        valueInput.appendChild(earliest);
        valueInput.appendChild(document.createTextNode("Latest:"));
        valueInput.appendChild(latest);
      } else if (rule.type === "DateRange") {
        valueInput = document.createElement("div");
        valueInput.style.display = "flex";
        valueInput.style.gap = "0.5em";
        valueInput.style.alignItems = "center";
        valueInput.style.flexWrap = "wrap";
        valueInput.style.width = "100%";
        const startDate = document.createElement("input");
        startDate.type = "date";
        startDate.placeholder = "Start Date";
        startDate.value = rule.value.start || "";
        startDate.addEventListener("input", (e) => {
          this.criteriaRules[idx].value.start = e.target.value;
        });
        const endDate = document.createElement("input");
        endDate.type = "date";
        endDate.placeholder = "End Date";
        endDate.value = rule.value.end || "";
        endDate.addEventListener("input", (e) => {
          this.criteriaRules[idx].value.end = e.target.value;
        });
        valueInput.appendChild(document.createTextNode("Start:"));
        valueInput.appendChild(startDate);
        valueInput.appendChild(document.createTextNode("End:"));
        valueInput.appendChild(endDate);
      } else if (rule.type === "Calendar") {
        // Custom dropdown for calendar selection with color dots
        valueInput = document.createElement("div");
        valueInput.className = "custom-calendar-dropdown";
        valueInput.style.position = "relative";
        valueInput.style.display = "inline-block";
        valueInput.style.width = "180px";
        valueInput.style.minWidth = "120px";
        valueInput.style.maxWidth = "220px";

        // Dropdown button
        const dropdownBtn = document.createElement("button");
        dropdownBtn.type = "button";
        dropdownBtn.className = "calendar-dropdown-btn";
        dropdownBtn.style.width = "100%";
        dropdownBtn.style.display = "flex";
        dropdownBtn.style.alignItems = "center";
        dropdownBtn.style.justifyContent = "space-between";
        dropdownBtn.style.padding = "0.3em 0.7em";
        dropdownBtn.style.border = "1px solid #ccc";
        dropdownBtn.style.borderRadius = "0.3em";
        dropdownBtn.style.background = "#fff";
        dropdownBtn.style.cursor = "pointer";
        dropdownBtn.style.fontSize = "1em";
        dropdownBtn.style.height = "2.2em";
        dropdownBtn.style.overflow = "hidden";

        // Selected calendar display
        const selected = this.calendars[rule.value] || this.calendars[this.getCalendarKeys()[0]];
        const selectedDot = document.createElement("span");
        selectedDot.className = "calendar-color-dot";
        selectedDot.style.background = selected ? selected.color : "#ccc";
        selectedDot.style.marginRight = "0.5em";
        const selectedName = document.createElement("span");
        selectedName.textContent = selected ? selected.name : "Select calendar";
        selectedName.style.whiteSpace = "nowrap";
        selectedName.style.overflow = "hidden";
        selectedName.style.textOverflow = "ellipsis";
        dropdownBtn.appendChild(selectedDot);
        dropdownBtn.appendChild(selectedName);

        // Dropdown arrow
        const arrow = document.createElement("span");
        arrow.textContent = "▼";
        arrow.style.marginLeft = "auto";
        arrow.style.fontSize = "0.9em";
        dropdownBtn.appendChild(arrow);

        valueInput.appendChild(dropdownBtn);

        // Dropdown list
        const dropdownList = document.createElement("div");
        dropdownList.className = "calendar-dropdown-list";
        dropdownList.style.position = "absolute";
        dropdownList.style.left = "0";
        dropdownList.style.top = "2.3em";
        dropdownList.style.width = "100%";
        dropdownList.style.background = "#fff";
        dropdownList.style.border = "1px solid #ccc";
        dropdownList.style.borderRadius = "0.3em";
        dropdownList.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        dropdownList.style.zIndex = "100";
        dropdownList.style.display = "none";
        dropdownList.style.maxHeight = "180px";
        dropdownList.style.overflowY = "auto";
        dropdownList.style.padding = "0.2em 0";

        this.getCalendarKeys().forEach((calendarKey) => {
          const calendar = this.calendars[calendarKey];
          const item = document.createElement("div");
          item.className = "calendar-dropdown-item";
          item.style.display = "flex";
          item.style.alignItems = "center";
          item.style.padding = "0.3em 0.7em";
          item.style.cursor = "pointer";
          item.style.fontSize = "1em";
          item.style.background = rule.value === calendarKey ? "#f0f4ff" : "#fff";
          item.style.borderBottom = "1px solid #f3f3f3";
          if (rule.value === calendarKey) item.style.fontWeight = "bold";
          // Color dot
          const dot = document.createElement("span");
          dot.className = "calendar-color-dot";
          dot.style.background = calendar.color;
          dot.style.marginRight = "0.5em";
          item.appendChild(dot);
          // Name
          const name = document.createElement("span");
          name.textContent = calendar.name;
          name.style.whiteSpace = "nowrap";
          name.style.overflow = "hidden";
          name.style.textOverflow = "ellipsis";
          item.appendChild(name);

          item.addEventListener("click", () => {
            this.criteriaRules[idx].value = calendarKey;
            this.renderCriteriaBuilder();
          });
          dropdownList.appendChild(item);
        });

        valueInput.appendChild(dropdownList);

        // Dropdown open/close logic
        dropdownBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownList.style.display = dropdownList.style.display === "block" ? "none" : "block";
        });
        document.addEventListener("click", () => {
          dropdownList.style.display = "none";
        });
      } else {
        valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.value = rule.value;
        valueInput.placeholder = rule.type === "Tag" ? "Tag name" : "Custom value";
        valueInput.addEventListener("input", (e) => {
          this.criteriaRules[idx].value = e.target.value;
        });
      }

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✕";
      removeBtn.style.marginLeft = "0.5em";
      removeBtn.style.alignSelf = "flex-start";
      removeBtn.addEventListener("click", () => {
        this.criteriaRules.splice(idx, 1);
        this.renderCriteriaBuilder();
      });

      line2.appendChild(compSel);
      line2.appendChild(valueInput);
      line2.appendChild(removeBtn);

      row.appendChild(line1);
      row.appendChild(line2);

      builder.appendChild(row);
    });
    if (this.criteriaRules.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No criteria added.";
      builder.appendChild(empty);
    }
  }

  populateCalendarDropdowns() {
    // Remove old selects if present
    const eventSelect = document.getElementById("event-calendar");
    const importSelect = document.getElementById("import-calendar");
    let eventParent, importParent;
    if (eventSelect) {
      eventParent = eventSelect.parentElement;
      eventSelect.remove();
    }
    if (importSelect) {
      importParent = importSelect.parentElement;
      importSelect.remove();
    }

    // Prepare options for custom select
    const calendarOptions = Object.keys(this.calendars).map((calendarKey) => ({
      value: calendarKey,
      label: this.calendars[calendarKey].name,
      color: this.calendars[calendarKey].color,
    }));

    // Create event calendar custom select
    const eventDiv = document.createElement("div");
    eventDiv.id = "event-calendar-container";
    eventDiv.style.width = "100%";
    eventParent.insertBefore(eventDiv, eventParent.firstChild.nextSibling);

    this.eventCalendarCustomSelect = new window.CustomColorSelect({
      options: calendarOptions,
      placeholder: "Make a selection",
      value: "",
      onChange: (val) => {
        // Optionally handle change event for event calendar
      },
    });
    eventDiv.appendChild(this.eventCalendarCustomSelect.el);

    // Create import calendar custom select
    const importDiv = document.createElement("div");
    importDiv.id = "import-calendar-container";
    importDiv.style.width = "100%";
    importParent.insertBefore(importDiv, importParent.firstChild.nextSibling);

    this.importCalendarCustomSelect = new window.CustomColorSelect({
      options: calendarOptions,
      placeholder: "Make a selection",
      value: "",
      onChange: (val) => {
        // Optionally handle change event for import calendar
      },
    });
    importDiv.appendChild(this.importCalendarCustomSelect.el);
  }

  // Calendar checkbox logic for both tools
  setupCalendarCheckboxes(prefix) {
    // prefix: "conflict" or "slot"
    const allBox = document.getElementById(`${prefix}-calendars-all`);
    const checkboxes = Array.from(document.querySelectorAll(`input[name='${prefix}-calendars']`));
    if (!allBox || checkboxes.length === 0) return;

    // Helper to update allBox state
    function updateAllBox() {
      const checkedCount = checkboxes.filter((cb) => cb.checked).length;
      if (checkedCount === checkboxes.length) {
        allBox.checked = true;
        allBox.indeterminate = false;
      } else if (checkedCount === 0) {
        allBox.checked = false;
        allBox.indeterminate = false;
      } else {
        allBox.checked = false;
        allBox.indeterminate = true;
      }
    }

    // When allBox is clicked
    allBox.addEventListener("change", () => {
      const checkedCount = checkboxes.filter((cb) => cb.checked).length;
      const shouldCheck = checkedCount !== checkboxes.length;
      checkboxes.forEach((cb) => (cb.checked = shouldCheck));
      updateAllBox();
    });

    // When any checkbox is clicked
    checkboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        updateAllBox();
      });
    });

    // Initial state
    updateAllBox();
  }

  // Dynamically render calendar checkboxes for conflict and slot selectors
  renderCalendarCheckboxes(prefix) {
    // prefix: "conflict" or "slot"
    const container = document.getElementById(`${prefix}-calendar-checkboxes`);
    if (!container) return;
    // Save checked state if possible
    const prevChecked = {};
    Array.from(container.querySelectorAll(`input[name='${prefix}-calendars']`)).forEach((cb) => {
      prevChecked[cb.value] = cb.checked;
    });

    // Clear container
    container.innerHTML = "";

    // Add select all
    const selectAllId = `${prefix}-calendars-all`;
    const selectAllLabel = document.createElement("label");
    selectAllLabel.className = "toggle-label";
    const selectAllBox = document.createElement("input");
    selectAllBox.type = "checkbox";
    selectAllBox.id = selectAllId;
    selectAllLabel.appendChild(selectAllBox);
    const selectAllSpan = document.createElement("span");
    selectAllSpan.id = `${prefix}-select-all-label`;
    selectAllSpan.textContent = "Select All";
    selectAllLabel.appendChild(selectAllSpan);
    container.appendChild(selectAllLabel);

    // Add calendar checkboxes dynamically
    Object.keys(this.calendars).forEach((calendarKey) => {
      const calendar = this.calendars[calendarKey];
      const div = document.createElement("div");
      const label = document.createElement("label");
      label.style.display = "inline-flex";
      label.style.alignItems = "center";
      label.style.gap = "0.5em";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.className = `${prefix}-calendar-checkbox`;
      box.name = `${prefix}-calendars`;
      box.value = calendarKey;
      box.style.marginRight = "0.5em";
      if (prevChecked[calendarKey]) box.checked = true;
      label.appendChild(box);

      // Add color dot (always visible, not squished)
      const colorDot = document.createElement("span");
      colorDot.className = "calendar-color-dot";
      colorDot.style.background = calendar.color;
      label.appendChild(colorDot);

      // Add calendar name (always visible)
      const nameSpan = document.createElement("span");
      nameSpan.textContent = calendar.name;
      nameSpan.style.whiteSpace = "nowrap";
      nameSpan.style.overflow = "visible";
      label.appendChild(nameSpan);

      div.appendChild(label);
      container.appendChild(div);
    });
  }

  // Dynamically get current calendar keys for criteria builder dropdowns
  getCalendarKeys() {
    return Object.keys(this.calendars);
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

    // Update both desktop and mobile date selectors
    document.getElementById("current-date").textContent = displayText;
    const sideCurrentDate = document.getElementById("side-current-date");
    if (sideCurrentDate) sideCurrentDate.textContent = displayText;
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

    // Use selected timezone for display if available
    const viewTzSelect = document.getElementById("view-timezone");
    const displayTz = viewTzSelect ? viewTzSelect.value : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert UTC events to display timezone for rendering
    const dayEvents = this.getEventsForDate(date);
    const now = new Date();

    // Group events by time conflicts
    const eventGroups = this.groupConflictingEvents(dayEvents);

    eventGroups.forEach((group, groupIdx) => {
      const groupWidth = group.length;
      // Debug print for group width and event titles
      console.log(`[WeekView] Group ${groupIdx}: width=${groupWidth}, events=[${group.map((ev) => ev.title).join(", ")}]`);

      group.forEach((event, index) => {
        // Debug print for event splitting logic
        console.log(`[WeekView] Event "${event.title}" in group of width ${groupWidth}, index ${index}`);
        const calendar = this.calendars[event.calendar];
        if (!calendar) {
          // Skip events with invalid or missing calendar
          return;
        }
        // Convert UTC to display timezone for rendering
        const eventStart = convertUTCToTZ(event.startDate, displayTz);
        const eventEnd = convertUTCToTZ(event.endDate, displayTz);

        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60); // minutes

        // If event starts before today, start at top
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        let eventMinutes = startHour * 60 + startMinute;
        let eventDuration = duration;
        if (eventStart < startOfDay) {
          eventMinutes = 0;
          eventDuration = (Math.min(eventEnd, new Date(startOfDay.getTime() + 24 * 60 * 60000)) - startOfDay) / (1000 * 60);
        }
        // If event ends after today, stretch to bottom
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        if (eventEnd > endOfDay) {
          eventDuration = (endOfDay - new Date(eventStart > startOfDay ? eventStart : startOfDay)) / (1000 * 60);
        }

        const availableHeight = window.innerHeight - 64 - 60; // toolbar + header
        const top = (eventMinutes / (24 * 60)) * availableHeight;
        // Add 2px to height if event ends after today to hide border-radius
        const height = Math.max((eventDuration / (24 * 60)) * availableHeight, 20) + (eventEnd > endOfDay ? 2 : 0);

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
          // Explicitly clear any previous split styles for single events
          eventElement.style.left = "0";
          eventElement.style.width = "100%";
          eventElement.style.right = "0";
        }
        // Add data attributes for real-time style updates
        eventElement.setAttribute("data-start", eventStart.toISOString());
        eventElement.setAttribute("data-end", eventEnd.toISOString());
        eventElement.setAttribute("data-color", calendar.color);

        // Hide top border-radius if event starts before today
        if (eventStart < startOfDay) {
          eventElement.style.borderTopLeftRadius = "0";
          eventElement.style.borderTopRightRadius = "0";
        }
        // Hide bottom border-radius if event ends after today
        if (eventEnd > endOfDay) {
          eventElement.style.borderBottomLeftRadius = "0";
          eventElement.style.borderBottomRightRadius = "0";
        }

        // All Day indicator
        if (event.allDay) {
          // Place [All Day] indicator inline before the title, not as a separate block
          const eventTitleElement = document.createElement("div");
          eventTitleElement.className = "event-title";
          const allDayBox = document.createElement("span");
          allDayBox.className = "all-day-indicator";
          allDayBox.textContent = "[All Day]";
          eventTitleElement.appendChild(allDayBox);
          // Add a space and then the title text, keeping it inline
          eventTitleElement.appendChild(document.createTextNode(" " + event.title));
          eventElement.appendChild(eventTitleElement);
        } else {
          const eventTitleElement = document.createElement("div");
          eventTitleElement.className = "event-title";
          eventTitleElement.textContent = event.title;
          eventElement.appendChild(eventTitleElement);
        }

        const eventTimeElement = document.createElement("div");
        eventTimeElement.className = "event-time";
        if (event.allDay) {
          eventTimeElement.textContent = "";
        } else {
          eventTimeElement.textContent = `${this.formatTime(eventStart, displayTz)} - ${this.formatTime(eventEnd, displayTz)}`;
        }
        eventElement.appendChild(eventTimeElement);

        container.appendChild(eventElement);
      });
    });
  }

  renderEventsForMonthDay(date, dayCell) {
    const dayEvents = this.getEventsForDate(date);

    const now = new Date();
    // Use selected timezone for display if available
    const viewTzSelect = document.getElementById("view-timezone");
    const displayTz = viewTzSelect ? viewTzSelect.value : Intl.DateTimeFormat().resolvedOptions().timeZone;

    dayEvents.forEach((event) => {
      // Show all events per day, skip if calendar is invalid
      const calendar = this.calendars[event.calendar];
      if (!calendar) return;
      const eventElement = document.createElement("div");
      eventElement.className = "month-event";
      const eventEnd = convertUTCToTZ(event.endDate, displayTz);
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
      // All Day indicator
      if (event.allDay) {
        const allDayBox = document.createElement("span");
        allDayBox.className = "all-day-indicator";
        allDayBox.textContent = "[All Day]";
        eventElement.appendChild(allDayBox);
      }
      eventElement.appendChild(document.createTextNode(event.title));
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
    // Return all events that overlap with the given date (for multi-day events)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.events.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      // Event overlaps if it starts before the end of the day and ends after the start of the day
      return eventStart <= endOfDay && eventEnd >= startOfDay;
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

    // Use selected timezone for display if available
    const viewTzSelect = document.getElementById("view-timezone");
    const displayTz = viewTzSelect ? viewTzSelect.value : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert UTC events to display timezone for rendering
    const dayEvents = this.getEventsForDate(date);
    const now = new Date();

    // Group events by time conflicts
    const eventGroups = this.groupConflictingEvents(dayEvents);

    eventGroups.forEach((group, groupIdx) => {
      const groupWidth = group.length;
      // Debug print for group width and event titles
      console.log(`[WeekView] Group ${groupIdx}: width=${groupWidth}, events=[${group.map((ev) => ev.title).join(", ")}]`);

      group.forEach((event, index) => {
        // Debug print for event splitting logic
        console.log(`[WeekView] Event "${event.title}" in group of width ${groupWidth}, index ${index}`);
        const calendar = this.calendars[event.calendar];
        if (!calendar) {
          // Skip events with invalid or missing calendar
          return;
        }
        // Convert UTC to display timezone for rendering
        const eventStart = convertUTCToTZ(event.startDate, displayTz);
        const eventEnd = convertUTCToTZ(event.endDate, displayTz);

        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const duration = (eventEnd - eventStart) / (1000 * 60); // minutes

        // Calculate position based on viewport height for week view
        const totalMinutesInDay = 24 * 60;
        let eventMinutes = startHour * 60 + startMinute;
        let eventDuration = duration;

        // If event starts before today, start at top
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        if (eventStart < startOfDay) {
          eventMinutes = 0;
          eventDuration = (Math.min(eventEnd, new Date(startOfDay.getTime() + totalMinutesInDay * 60000)) - startOfDay) / (1000 * 60);
        }
        // If event ends after today, stretch to bottom
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        if (eventEnd > endOfDay) {
          eventDuration = (endOfDay - new Date(eventStart > startOfDay ? eventStart : startOfDay)) / (1000 * 60);
        }

        const availableHeight = window.innerHeight - 64 - 60; // toolbar + header
        const top = (eventMinutes / totalMinutesInDay) * availableHeight;
        // Add 2px to height if event ends after today to hide border-radius
        const height = Math.max((eventDuration / totalMinutesInDay) * availableHeight, 20) + (eventEnd > endOfDay ? 2 : 0);

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
          // Explicitly clear any previous split styles for single events
          eventElement.style.left = "0";
          eventElement.style.width = "100%";
          eventElement.style.right = "0";
        }
        // Add data attributes for real-time style updates
        eventElement.setAttribute("data-start", eventStart.toISOString());
        eventElement.setAttribute("data-end", eventEnd.toISOString());
        eventElement.setAttribute("data-color", calendar.color);

        // Hide top border-radius if event starts before today
        if (eventStart < startOfDay) {
          eventElement.style.borderTopLeftRadius = "0";
          eventElement.style.borderTopRightRadius = "0";
        }
        // Hide bottom border-radius if event ends after today
        if (eventEnd > endOfDay) {
          eventElement.style.borderBottomLeftRadius = "0";
          eventElement.style.borderBottomRightRadius = "0";
        }

        const eventTitleElement = document.createElement("div");
        eventTitleElement.className = "event-title";
        eventTitleElement.textContent = event.title;
        eventElement.appendChild(eventTitleElement);

        const eventTimeElement = document.createElement("div");
        eventTimeElement.className = "event-time";
        eventTimeElement.textContent = `${this.formatTime(eventStart, displayTz || Intl.DateTimeFormat().resolvedOptions().timeZone)} - ${this.formatTime(eventEnd, displayTz || Intl.DateTimeFormat().resolvedOptions().timeZone)}`;
        eventElement.appendChild(eventTimeElement);

        container.appendChild(eventElement);
      });
    });
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

      console.log("[calculateEndTime] start:", start, "end:", end, "hours:", hours, "minutes:", minutes);

      if (!isNaN(end.getTime())) {
        document.getElementById("event-end-date").value = end.toISOString().split("T")[0];
        document.getElementById("event-end-time").value = end.toTimeString().slice(0, 5);
      } else {
        console.warn("[calculateEndTime] Invalid end date calculated!", end);
      }
    }
  }

  createEvent(e) {
    e.preventDefault();

    // Use custom select value for calendar
    let calendarKey = "";
    if (this.eventCalendarCustomSelect && typeof this.eventCalendarCustomSelect.getValue === "function") {
      calendarKey = this.eventCalendarCustomSelect.getValue();
    } else {
      // fallback if custom select not loaded
      const eventCalendarSelect = document.getElementById("event-calendar");
      calendarKey = eventCalendarSelect ? eventCalendarSelect.value : "";
    }

    const calendarValue = document.getElementById("event-calendar").value;
    if (!calendarValue || !(calendarValue in this.calendars)) {
      alert("Please select a valid calendar before creating an event.");
      return;
    }

    const formData = new FormData(e.target);

    // Validation and sensible defaults
    const allDay = document.getElementById("event-all-day")?.checked || false;
    const tz = document.getElementById("event-timezone") ? document.getElementById("event-timezone").value : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Helper to convert local date/time to UTC ISO string
    function toUTCISOString(localDateStr, timezone) {
      try {
        const d = new Date(new Date(localDateStr + ":00").toLocaleString("en-US", { timeZone: timezone }));
        return d.toISOString();
      } catch (e) {
        return new Date(localDateStr + ":00").toISOString();
      }
    }

    // Get and validate start date
    const startDateVal = document.getElementById("event-start-date").value;
    if (!startDateVal) {
      alert("Please select a valid start date.");
      return;
    }

    let startDateISO, endDateISO, startDate, endDate;
    if (allDay) {
      // All-day event: start at 00:00, end at 01:00 UTC (shows at top of day)
      startDateISO = toUTCISOString(startDateVal + "T00:00", "UTC");
      startDate = new Date(startDateISO);
      // End at 1AM same day
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    } else {
      // Timed event: require start time
      const startTimeVal = document.getElementById("event-start-time").value;
      if (!startTimeVal) {
        alert("Please select a valid start time.");
        return;
      }
      const endDateVal = document.getElementById("event-end-date").value;
      const endTimeVal = document.getElementById("event-end-time").value;
      const startDateStr = `${startDateVal}T${startTimeVal}`;
      const endDateStr = endDateVal && endTimeVal ? `${endDateVal}T${endTimeVal}` : "";
      startDateISO = toUTCISOString(startDateStr, tz);
      startDate = new Date(startDateISO);
      if (endDateStr) {
        endDateISO = toUTCISOString(endDateStr, tz);
        endDate = new Date(endDateISO);
      } else {
        // Sensible default: 1 hour after start
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }
    }

    // Defensive check for invalid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      alert("Invalid start or end date/time. Please check your inputs.");
      console.warn("[createEvent] Invalid dates:", { startDate, endDate });
      return;
    }

    // Recurrence logic
    const recurring = document.getElementById("event-recurring")?.checked || false;
    let recurrenceType = document.getElementById("recurrence-type")?.value || "";
    let recurrenceCount = document.getElementById("limit-recurrences")?.checked ? Number.parseInt(document.getElementById("recurrence-count").value) || null : null;

    // Custom recurrence for all-day: only years, months, days
    let customYears = 0,
      customMonths = 0,
      customDays = 0,
      customHours = 0;
    if (recurrenceType === "custom") {
      customYears = Number.parseInt(document.getElementById("custom-years")?.value) || 0;
      customMonths = Number.parseInt(document.getElementById("custom-months")?.value) || 0;
      customDays = Number.parseInt(document.getElementById("custom-days")?.value) || 0;
      if (!allDay) {
        customHours = Number.parseInt(document.getElementById("custom-hours")?.value) || 0;
      }
    }

    const event = {
      id: Date.now().toString(),
      calendar: calendarValue,
      title: document.getElementById("event-title").value || "(No Title)",
      description: document.getElementById("event-description").value || "",
      location: document.getElementById("event-location").value || "",
      startDate: startDate,
      endDate: endDate,
      allDay: allDay,
      recurring: recurring,
      recurrenceType: recurrenceType,
      recurrenceCount: recurrenceCount,
      customYears: customYears,
      customMonths: customMonths,
      customDays: customDays,
      customHours: customHours,
      timezone: tz,
    };

    this.events.push(event);
    console.log("[createEvent] Events array after push:", this.events);
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

    // No sample events; return empty array if nothing saved
    return [];
  }

  saveEvents() {
    localStorage.setItem("calendar-events", JSON.stringify(this.events));
  }

  formatTime(date, tz) {
    // tz: IANA timezone string
    const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  }

  formatTimeLabel(hour, minute, tz) {
    // Helper for time labels in time columns
    const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const d = new Date(Date.UTC(2000, 0, 1, hour, minute));
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  }
}

// --- Auto-resize #current-date font to fit one line ---
function fitCurrentDateFont() {
  const el = document.getElementById("current-date");
  if (!el) return;
  const maxFont = 24; // px
  const minFont = 12; // px
  el.style.fontSize = maxFont + "px";
  el.style.whiteSpace = "nowrap";
  // Removed overflow and textOverflow to prevent ellipsis
  let fits = el.scrollWidth <= el.clientWidth;
  while (!fits && parseFloat(el.style.fontSize) > minFont) {
    el.style.fontSize = parseFloat(el.style.fontSize) - 1 + "px";
    fits = el.scrollWidth <= el.clientWidth;
  }
}

// Call after rendering or updating the date string
function observeCurrentDateResize() {
  const el = document.getElementById("current-date");
  if (!el) return;
  // Observe changes to the text content
  const observer = new MutationObserver(fitCurrentDateFont);
  observer.observe(el, { childList: true, characterData: true, subtree: true });
  // Also fit on window resize
  window.addEventListener("resize", fitCurrentDateFont);
  // Initial fit
  fitCurrentDateFont();
}

// --- Convert UTC Date to selected timezone (returns Date object in that TZ) ---
function convertUTCToTZ(dateInput, tz) {
  // Accepts a Date object or ISO string
  const utcDate = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!(utcDate instanceof Date) || isNaN(utcDate.getTime())) {
    console.error("[convertUTCToTZ] Invalid date input:", dateInput);
    // Return a fallback date or null to prevent RangeError
    return new Date(NaN);
  }

  // Use toLocaleString with explicit options for robust parsing
  const opts = {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };
  const localeString = utcDate.toLocaleString("en-US", opts);

  // Example output: "9/12/2025, 6:00 AM"
  // Split into date and time
  const [datePart, timePart] = localeString.split(", ");
  if (!datePart || !timePart) {
    console.error("[convertUTCToTZ] Unexpected locale string format:", localeString, "from", utcDate, "tz:", tz);
    return new Date(NaN);
  }

  // Parse date
  const [month, day, year] = datePart.split("/").map(Number);
  // Parse time and meridian
  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})\s*([APap][Mm])$/);
  let hour = 0,
    minute = 0;
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    const meridian = timeMatch[3].toLowerCase();
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
  } else {
    // Fallback: try to parse hour/minute without meridian
    const fallbackTime = timePart.split(":");
    hour = Number(fallbackTime[0]) || 0;
    minute = Number(fallbackTime[1]) || 0;
  }

  const result = new Date(year, month - 1, day, hour, minute);
  if (isNaN(result.getTime())) {
    console.error("[convertUTCToTZ] Failed to construct valid date from parsed parts:", { year, month, day, hour, minute }, "original:", dateInput, "tz:", tz, "localeString:", localeString);
  }
  return result;
}

// Initialize the calendar app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Load saved theme
  observeCurrentDateResize();
  const savedTheme = localStorage.getItem("calendar-theme") || "light";
  document.getElementById("app").classList.add(`theme-${savedTheme}`);

  // Initialize the app
  new CalendarApp();
});
