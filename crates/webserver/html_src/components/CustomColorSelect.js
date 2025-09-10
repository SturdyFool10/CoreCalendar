/**
 * CustomColorSelect - A plain JS dropdown replacement for <select> with color dots.
 * Usage:
 *   const select = new CustomColorSelect({
 *     options: [{ value: "personal", label: "Personal", color: "#007bff" }, ...],
 *     placeholder: "Make a selection",
 *     value: "personal", // optional initial value
 *     onChange: (value) => { ... },
 *   });
 *   parentElement.appendChild(select.el);
 *   // To get/set value: select.getValue(), select.setValue(val)
 */
class CustomColorSelect {
  constructor({ options, placeholder = "Select...", value = "", onChange = null }) {
    this.options = options || [];
    this.placeholder = placeholder;
    this.value = value;
    this.onChange = typeof onChange === "function" ? onChange : () => {};
    this.isOpen = false;

    this.el = this._render();
    this._attachEvents();
  }

  _render() {
    // Container
    const container = document.createElement("div");
    container.className = "custom-color-select";
    container.tabIndex = 0;
    container.style.position = "relative";
    container.style.width = "100%";
    container.style.minWidth = "120px";
    container.style.maxWidth = "220px";
    container.style.display = "inline-block";
    container.style.userSelect = "none";

    // Selected trigger (use <a href="#"> for better styling)
    this.selectedBtn = document.createElement("a");
    this.selectedBtn.href = "#";
    this.selectedBtn.className = "custom-color-select-btn";
    this.selectedBtn.style.width = "100%";
    this.selectedBtn.style.display = "flex";
    this.selectedBtn.style.alignItems = "center";
    this.selectedBtn.style.justifyContent = "space-between";
    this.selectedBtn.style.padding = "0.3em 0.7em";
    this.selectedBtn.style.border = "1px solid #ccc";
    this.selectedBtn.style.borderRadius = "0.3em";
    this.selectedBtn.style.background = "var(--bg-primary, #fff)";
    this.selectedBtn.style.cursor = "pointer";
    this.selectedBtn.style.fontSize = "1em";
    this.selectedBtn.style.height = "2.2em";
    this.selectedBtn.style.overflow = "hidden";
    this.selectedBtn.style.textDecoration = "none";
    this.selectedBtn.style.color = "inherit";

    // Dot + label
    this.selectedDot = document.createElement("span");
    this.selectedDot.className = "color-dot";
    this.selectedDot.style.display = "inline-block";
    this.selectedDot.style.width = "1em";
    this.selectedDot.style.height = "1em";
    this.selectedDot.style.borderRadius = "50%";
    this.selectedDot.style.marginRight = "0.5em";
    this.selectedDot.style.background = "#ccc";

    this.selectedLabel = document.createElement("span");
    this.selectedLabel.className = "custom-color-select-label";
    this.selectedLabel.style.whiteSpace = "nowrap";
    this.selectedLabel.style.overflow = "hidden";
    this.selectedLabel.style.textOverflow = "ellipsis";
    this.selectedLabel.textContent = this.placeholder;

    // Arrow
    this.arrow = document.createElement("span");
    this.arrow.textContent = "▼";
    this.arrow.style.marginLeft = "auto";
    this.arrow.style.fontSize = "0.9em";

    this.selectedBtn.appendChild(this.selectedDot);
    this.selectedBtn.appendChild(this.selectedLabel);
    this.selectedBtn.appendChild(this.arrow);

    // Dropdown list
    this.dropdown = document.createElement("div");
    this.dropdown.className = "custom-color-select-dropdown";
    this.dropdown.style.position = "absolute";
    this.dropdown.style.left = "0";
    this.dropdown.style.top = "2.3em";
    this.dropdown.style.width = "100%";
    this.dropdown.style.background = "#fff";
    this.dropdown.style.border = "1px solid #ccc";
    this.dropdown.style.borderRadius = "0.3em";
    this.dropdown.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
    this.dropdown.style.zIndex = "100";
    this.dropdown.style.display = "none";
    this.dropdown.style.maxHeight = "180px";
    this.dropdown.style.overflowY = "auto";
    this.dropdown.style.padding = "0.2em 0";

    this._renderOptions();

    container.appendChild(this.selectedBtn);
    container.appendChild(this.dropdown);

    // Set initial value
    this.setValue(this.value, false);

    return container;
  }

  _renderOptions() {
    this.dropdown.innerHTML = "";
    this.options.forEach((opt) => {
      const item = document.createElement("div");
      item.className = "custom-color-select-option";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.padding = "0.3em 0.7em";
      item.style.cursor = "pointer";
      item.style.fontSize = "1em";
      item.style.background = this.value === opt.value ? "#f0f4ff" : "#fff";
      item.style.borderBottom = "1px solid #f3f3f3";
      if (this.value === opt.value) item.style.fontWeight = "bold";

      // Dot
      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.display = "inline-block";
      dot.style.width = "1em";
      dot.style.height = "1em";
      dot.style.borderRadius = "50%";
      dot.style.marginRight = "0.5em";
      dot.style.background = opt.color || "#ccc";
      item.appendChild(dot);

      // Label
      const label = document.createElement("span");
      label.textContent = opt.label;
      label.style.whiteSpace = "nowrap";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      item.appendChild(label);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setValue(opt.value, true);
        this.close();
      });

      this.dropdown.appendChild(item);
    });
  }

  _attachEvents() {
    this.selectedBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    // Keyboard navigation
    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        this.open();
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!this.el.contains(e.target)) {
        this.close();
      }
    });
  }

  open() {
    this.dropdown.style.display = "block";
    this.isOpen = true;
    this.arrow.textContent = "▲";
  }

  close() {
    this.dropdown.style.display = "none";
    this.isOpen = false;
    this.arrow.textContent = "▼";
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  setValue(value, fireChange = true) {
    const opt = this.options.find((o) => o.value === value);
    if (opt) {
      this.value = opt.value;
      this.selectedDot.style.background = opt.color || "#ccc";
      this.selectedLabel.textContent = opt.label;
    } else {
      this.value = "";
      this.selectedDot.style.background = "#ccc";
      this.selectedLabel.textContent = this.placeholder;
    }
    this._renderOptions();
    if (fireChange) this.onChange(this.value);
  }

  getValue() {
    return this.value;
  }

  setOptions(options) {
    this.options = options || [];
    this._renderOptions();
    // Reset value if current value is not in new options
    if (!this.options.some((o) => o.value === this.value)) {
      this.setValue("", true);
    }
  }
}

// Export for use in other scripts
window.CustomColorSelect = CustomColorSelect;
