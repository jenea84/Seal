document.addEventListener("DOMContentLoaded", function () {
  // DOM elements
  const elements = {
    textDisplay: document.getElementById("text-display"),
    textInput: document.getElementById("text-input"),
    fontSizeControl: document.getElementById("font-size"),
    fontSizeValue: document.getElementById("font-size-value"),
    lineHeightControl: document.getElementById("line-height"),
    lineHeightValue: document.getElementById("line-height-value"),
    speedDisplay: document.getElementById("speed"),
    accuracyDisplay: document.getElementById("accuracy"),
    progressDisplay: document.getElementById("progress"),
    goalDisplay: document.getElementById("goal"),
    timeLeftDisplay: document.getElementById("time-left"),
    newTextBtn: document.getElementById("new-text"),
    resetBtn: document.getElementById("reset"),
    themeToggleBtn: document.getElementById("theme-toggle"),
    exportResultsBtn: document.getElementById("export-results"),
    textCategorySelect: document.getElementById("text-category"),
    languageSelect: document.getElementById("language"),
    testDurationSelect: document.getElementById("test-duration"),
    chartCanvas: document.getElementById("resultsChart"),
    rhythmVisualizer: document.querySelector(".rhythm-visualizer"),
    mistakesReport: document.getElementById("mistakes-report"),
  };

  // Application state
  const state = {
    startTime: null,
    endTime: null,
    totalChars: 0,
    correctChars: 0,
    currentText: "",
    currentTextObj: null,
    statsTimer: null,
    countdownTimer: null,
    testDuration: 60,
    chart: null,
    lastKeyTime: null,
    keyIntervals: [],
    mistakesHistory: {},
    language: "ru",
    lineHeight: 1.6,
    textsData: [],
    serverUrl: "https://your-server-api.com/results",
    difficultyLevels: {
      ru: {
        easy: 50,
        medium: 100,
        hard: 150,
        expert: 200,
        master: 250,
        guru: 300,
      },
      en: {
        easy: 40,
        medium: 80,
        hard: 120,
        expert: 160,
        master: 200,
        guru: 240,
      },
    },
  };

  // Storage class
  class TypingStorage {
    static getResults() {
      try {
        return JSON.parse(localStorage.getItem("typingResults") || "[]");
      } catch (e) {
        console.error("Error reading results from storage", e);
        return [];
      }
    }

    static saveResults(results) {
      try {
        localStorage.setItem("typingResults", JSON.stringify(results));
      } catch (e) {
        console.error("Error saving results to storage", e);
      }
    }

    static getMistakes() {
      try {
        return JSON.parse(localStorage.getItem("typingMistakes") || "{}");
      } catch (e) {
        console.error("Error reading mistakes from storage", e);
        return {};
      }
    }

    static saveMistakes(mistakes) {
      try {
        localStorage.setItem("typingMistakes", JSON.stringify(mistakes));
      } catch (e) {
        console.error("Error saving mistakes to storage", e);
      }
    }

    static getSetting(key, defaultValue) {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
      } catch (e) {
        console.error(`Error reading setting ${key} from storage`, e);
        return defaultValue;
      }
    }

    static saveSetting(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error(`Error saving setting ${key} to storage`, e);
      }
    }
  }

  // Load texts from JSON
  async function loadTexts() {
    try {
      const response = await fetch("texts.json");
      if (!response.ok) {
        throw new Error("Failed to load texts");
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading texts:", error);
      return [];
    }
  }

  // Initialize app
  async function init() {
    state.mistakesHistory = TypingStorage.getMistakes();
    state.textsData = await loadTexts();
    setupEventListeners();
    loadSettings();
    updateFontSize();
    updateLineHeight();
    initChart();
    checkTheme();
    loadNewText();
  }

  function loadSettings() {
    elements.fontSizeControl.value = TypingStorage.getSetting("fontSize", "16");
    elements.fontSizeValue.textContent = `${elements.fontSizeControl.value}px`;

    state.testDuration = parseInt(
      TypingStorage.getSetting("testDuration", "60")
    );
    elements.testDurationSelect.value = state.testDuration;

    elements.textCategorySelect.value = TypingStorage.getSetting(
      "textCategory",
      "all"
    );

    state.language = TypingStorage.getSetting("language", "ru");
    elements.languageSelect.value = state.language;

    state.lineHeight = parseFloat(
      TypingStorage.getSetting("lineHeight", "1.6")
    );
    elements.lineHeightControl.value = state.lineHeight;
    elements.lineHeightValue.textContent = state.lineHeight;
  }

  function setupEventListeners() {
    elements.textInput.addEventListener("input", handleTextInput);
    elements.fontSizeControl.addEventListener("input", updateFontSize);
    elements.lineHeightControl.addEventListener("input", function () {
      state.lineHeight = parseFloat(this.value);
      elements.lineHeightValue.textContent = state.lineHeight;
      TypingStorage.saveSetting("lineHeight", state.lineHeight);
      updateLineHeight();
    });
    elements.newTextBtn.addEventListener("click", loadNewText);
    elements.resetBtn.addEventListener("click", resetStats);

    elements.textCategorySelect.addEventListener("change", function () {
      TypingStorage.saveSetting("textCategory", this.value);
      loadNewText();
    });

    elements.languageSelect.addEventListener("change", function () {
      state.language = this.value;
      TypingStorage.saveSetting("language", this.value);
      loadNewText();
    });

    elements.testDurationSelect.addEventListener("change", function () {
      state.testDuration = parseInt(this.value);
      TypingStorage.saveSetting("testDuration", this.value);
      resetStats();
    });

    elements.themeToggleBtn.addEventListener("click", toggleTheme);
    elements.exportResultsBtn.addEventListener("click", exportResults);

    // Прокрутка к кнопкам только при явном нажатии
    [
      elements.newTextBtn,
      elements.resetBtn,
      elements.themeToggleBtn,
      elements.exportResultsBtn,
    ].forEach((btn) => {
      btn.addEventListener("click", () => {
        const buttonsContainer = document.querySelector(".buttons-container");
        buttonsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function updateLineHeight() {
    elements.textDisplay.style.lineHeight = state.lineHeight;
    elements.textInput.style.lineHeight = state.lineHeight;
  }

  function updateFontSize() {
    const size = elements.fontSizeControl.value;
    elements.textDisplay.style.fontSize = `${size}px`;
    elements.textInput.style.fontSize = `${size}px`;
    elements.fontSizeValue.textContent = `${size}px`;
    TypingStorage.saveSetting("fontSize", size);
  }

  function loadNewText() {
    const category = elements.textCategorySelect.value;
    state.testDuration = parseInt(elements.testDurationSelect.value);

    let filteredTexts = state.textsData.filter(
      (text) => text.language === state.language
    );

    if (category === "difficult") {
      const difficultChars = getDifficultChars();
      if (difficultChars.length > 0) {
        state.currentText = generateDifficultText(difficultChars);
        renderText();
        resetStats();
        return;
      }
    }

    if (category !== "all") {
      filteredTexts = filteredTexts.filter(
        (text) => text.category === category
      );
    }

    if (filteredTexts.length === 0) {
      filteredTexts = state.textsData.filter(
        (text) => text.language === state.language
      );
    }

    const randomIndex = Math.floor(Math.random() * filteredTexts.length);
    state.currentTextObj = filteredTexts[randomIndex];
    state.currentText = state.currentTextObj.content;

    renderText();
    resetStats();
    updateGoal();
  }

  function generateDifficultText(chars) {
    const words = [];
    for (let i = 0; i < 10; i++) {
      const wordLength = 3 + Math.floor(Math.random() * 7);
      let word = "";
      for (let j = 0; j < wordLength; j++) {
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        word += randomChar;
      }
      words.push(word);
    }
    return words.join(" ");
  }

  function getDifficultChars() {
    const entries = Object.entries(state.mistakesHistory);
    if (entries.length === 0) return [];

    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5).map(([char]) => char);
  }

  function renderText() {
    elements.textDisplay.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const chunkSize = 500;

    for (let i = 0; i < state.currentText.length; i += chunkSize) {
      const chunk = state.currentText.slice(i, i + chunkSize);

      chunk.split("").forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.setProperty("--char-index", i + index);
        fragment.appendChild(span);
      });
    }

    elements.textDisplay.appendChild(fragment);
    state.totalChars = state.currentText.length;
  }

  function resetStats() {
    state.startTime = null;
    state.endTime = null;
    state.correctChars = 0;
    state.lastKeyTime = null;
    state.keyIntervals = [];
    elements.textInput.value = "";
    elements.textInput.disabled = false;
    elements.textInput.focus();
    clearInterval(state.statsTimer);
    clearInterval(state.countdownTimer);

    elements.speedDisplay.textContent = "0";
    elements.accuracyDisplay.textContent = "0";
    elements.progressDisplay.textContent = "0";
    elements.timeLeftDisplay.textContent =
      state.testDuration > 0 ? state.testDuration : "-";

    const spans = elements.textDisplay.querySelectorAll("span");
    spans.forEach((span) => {
      span.className = "";
    });

    if (spans.length > 0) {
      spans[0].classList.add("current");
    }

    elements.textDisplay.classList.remove("test-complete");
  }

  function handleTextInput(e) {
    const inputText = e.target.value;
    const inputLength = inputText.length;

    const now = Date.now();
    if (state.lastKeyTime) {
      const interval = now - state.lastKeyTime;
      state.keyIntervals.push(interval);
      updateRhythmVisualizer(interval);
    }
    state.lastKeyTime = now;

    if (!state.startTime && inputLength > 0) {
      state.startTime = new Date();
      state.statsTimer = setInterval(updateStats, 100);

      if (state.testDuration > 0) {
        startCountdown();
      }
    }

    highlightCharacters(inputText);
    updateStats();

    if (inputLength === state.currentText.length) {
      endTest();
    }
  }

  function updateRhythmVisualizer(interval) {
    if (state.keyIntervals.length === 0) return;

    const avgInterval =
      state.keyIntervals.reduce((a, b) => a + b, 0) / state.keyIntervals.length;
    const rhythm = Math.min(100, Math.max(0, 100 - avgInterval / 20));
    elements.rhythmVisualizer.style.setProperty("--rhythm", `${rhythm}%`);
  }

  function startCountdown() {
    let timeLeft = state.testDuration;
    elements.timeLeftDisplay.textContent = timeLeft;

    state.countdownTimer = setInterval(() => {
      timeLeft--;
      elements.timeLeftDisplay.textContent = timeLeft;

      if (timeLeft <= 0) {
        endTest();
      }
    }, 1000);
  }

  function endTest() {
    if (!state.startTime) return;

    state.endTime = new Date();
    elements.textInput.disabled = true;
    clearInterval(state.statsTimer);
    clearInterval(state.countdownTimer);

    const inputLength = elements.textInput.value.length;
    if (inputLength > 0) {
      const mistakes = trackMistakes(elements.textInput.value);
      saveResults(mistakes);
      showMistakesReport(mistakes);
    }

    updateChart();
    elements.textDisplay.classList.add("test-complete");
    updateGoal();
  }

  function highlightCharacters(inputText) {
    const spans = elements.textDisplay.querySelectorAll("span");
    let correctCount = 0;

    spans.forEach((span, index) => {
      span.classList.remove("correct", "incorrect", "current");

      if (index < inputText.length) {
        if (inputText[index] === state.currentText[index]) {
          span.classList.add("correct");
          correctCount++;
        } else {
          span.classList.add("incorrect");
        }
      }

      if (index === inputText.length) {
        span.classList.add("current");
      }
    });

    state.correctChars = correctCount;
  }

  function trackMistakes(inputText) {
    const mistakes = {};
    for (let i = 0; i < inputText.length; i++) {
      if (inputText[i] !== state.currentText[i]) {
        const char = state.currentText[i];
        mistakes[char] = (mistakes[char] || 0) + 1;
      }
    }
    return mistakes;
  }

  async function saveResultsToServer(results) {
    try {
      const response = await fetch(state.serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        throw new Error("Server response was not ok");
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving results to server:", error);
      return null;
    }
  }

  async function saveResults(mistakes) {
    const inputLength = elements.textInput.value.length;
    const elapsedTime = (state.endTime - state.startTime) / 1000 / 60;
    const speed = Math.round(inputLength / elapsedTime);
    const accuracy = Math.round((state.correctChars / inputLength) * 100);

    const resultData = {
      date: new Date().toISOString(),
      speed,
      accuracy,
      textLength: state.currentText.length,
      category: elements.textCategorySelect.value,
      language: state.language,
      duration: state.testDuration,
      mistakes: Object.keys(mistakes).length,
    };

    // Сохраняем локально
    const results = TypingStorage.getResults();
    results.push(resultData);
    TypingStorage.saveResults(results);

    // Сохраняем на сервере (если доступно)
    if (navigator.onLine) {
      await saveResultsToServer(resultData);
    }

    // Сохраняем ошибки
    for (const [char, count] of Object.entries(mistakes)) {
      state.mistakesHistory[char] = (state.mistakesHistory[char] || 0) + count;
    }
    TypingStorage.saveMistakes(state.mistakesHistory);
  }

  function showMistakesReport(mistakes) {
    const entries = Object.entries(mistakes);
    if (entries.length === 0) {
      elements.mistakesReport.innerHTML =
        state.language === "ru"
          ? "<p>Ошибок не обнаружено! Отличный результат!</p>"
          : "<p>No mistakes found! Great result!</p>";
      return;
    }

    entries.sort((a, b) => b[1] - a[1]);

    let html =
      state.language === "ru"
        ? "<h3>Частые ошибки:</h3>"
        : "<h3>Common mistakes:</h3>";

    entries.slice(0, 5).forEach(([char, count]) => {
      const contexts = findMistakeContexts(char);

      html += `
        <div class="mistake-item">
          <span class="mistake-char">${
            char === " " ? (state.language === "ru" ? "Пробел" : "Space") : char
          }</span>
          <span class="mistake-count">${count} ${
        state.language === "ru" ? "раз" : "times"
      }</span>
        </div>
        <div class="mistake-details">
          <p>${state.language === "ru" ? "Контекст:" : "Context:"}</p>
          ${contexts
            .map((ctx) => `<div class="mistake-context">${ctx}</div>`)
            .join("")}
        </div>
      `;
    });

    elements.mistakesReport.innerHTML = html;
  }

  function findMistakeContexts(char) {
    const inputText = elements.textInput.value;
    const contexts = [];
    const contextLength = 10;

    for (let i = 0; i < inputText.length; i++) {
      if (state.currentText[i] === char && inputText[i] !== char) {
        const start = Math.max(0, i - contextLength);
        const end = Math.min(state.currentText.length, i + contextLength + 1);
        const context = state.currentText.slice(start, end);
        contexts.push(context);

        if (contexts.length >= 3) break;
      }
    }

    return contexts.length > 0
      ? contexts
      : [state.language === "ru" ? "Контекст не найден" : "Context not found"];
  }

  function updateStats() {
    if (!state.startTime) return;

    const now = new Date();
    const elapsedTime = (now - state.startTime) / 1000 / 60;
    const inputLength = elements.textInput.value.length;

    if (elapsedTime > 0) {
      const speed = Math.round(inputLength / elapsedTime);
      elements.speedDisplay.textContent = speed;
    }

    if (inputLength > 0) {
      const accuracy = Math.round((state.correctChars / inputLength) * 100);
      elements.accuracyDisplay.textContent = isNaN(accuracy) ? 0 : accuracy;
    }

    const progress = Math.round((inputLength / state.totalChars) * 100);
    elements.progressDisplay.textContent = progress;
  }

  function updateGoal() {
    const results = TypingStorage.getResults();
    const speeds = results
      .filter((r) => r.language === state.language)
      .map((r) => r.speed);
    const avgSpeed =
      speeds.length > 0
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length)
        : 0;

    const levels = state.difficultyLevels[state.language];
    let nextLevel = "easy";

    if (avgSpeed >= levels.guru) nextLevel = "guru";
    else if (avgSpeed >= levels.master) nextLevel = "master";
    else if (avgSpeed >= levels.expert) nextLevel = "expert";
    else if (avgSpeed >= levels.hard) nextLevel = "hard";
    else if (avgSpeed >= levels.medium) nextLevel = "medium";

    elements.goalDisplay.textContent = `${levels[nextLevel]} (${nextLevel})`;
    elements.goalDisplay.dataset.level = nextLevel;
  }

  function initChart() {
    const ctx = elements.chartCanvas.getContext("2d");
    state.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label:
              state.language === "ru"
                ? "Скорость (зн./мин)"
                : "Speed (chars/min)",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            tension: 0.1,
            fill: true,
          },
          {
            label: state.language === "ru" ? "Точность (%)" : "Accuracy (%)",
            data: [],
            borderColor: "#2ecc71",
            backgroundColor: "rgba(46, 204, 113, 0.1)",
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  function updateChart() {
    const results = TypingStorage.getResults();
    const filteredResults = results.filter(
      (r) => r.language === state.language
    );

    if (filteredResults.length === 0) {
      state.chart.data.labels = [];
      state.chart.data.datasets[0].data = [];
      state.chart.data.datasets[1].data = [];
      state.chart.update();
      return;
    }

    const labels = filteredResults.map((_, i) => i + 1);
    const speeds = filteredResults.map((r) => r.speed);
    const accuracies = filteredResults.map((r) => r.accuracy);

    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = speeds;
    state.chart.data.datasets[1].data = accuracies;

    const maxSpeed = Math.max(...speeds);
    state.chart.options.scales.y.max = Math.max(
      100,
      Math.ceil(maxSpeed / 50) * 50
    );

    state.chart.update();
  }

  function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    TypingStorage.saveSetting("darkTheme", isDark);
    elements.themeToggleBtn.textContent = isDark
      ? state.language === "ru"
        ? "Светлая тема"
        : "Light theme"
      : state.language === "ru"
      ? "Темная тема"
      : "Dark theme";
  }

  function checkTheme() {
    const isDark = TypingStorage.getSetting("darkTheme", "false") === "true";
    if (isDark) {
      document.body.classList.add("dark-theme");
      elements.themeToggleBtn.textContent =
        state.language === "ru" ? "Светлая тема" : "Light theme";
    }
  }

  function exportResults() {
    const results = TypingStorage.getResults();
    if (results.length === 0) {
      alert(
        state.language === "ru"
          ? "Нет данных для экспорта"
          : "No data to export"
      );
      return;
    }

    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typing-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Start the application
  init();
});
