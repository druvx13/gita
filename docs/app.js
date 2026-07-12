const DATA_BASE = "../data";

const state = {
  chapters: [],
  verses: [],
  translations: [],
  currentChapter: 1,
  currentLanguage: "english",
  currentAuthor: "",
};

const chapterSelect = document.querySelector("#chapterSelect");
const languageSelect = document.querySelector("#languageSelect");
const authorSelect = document.querySelector("#authorSelect");
const chapterList = document.querySelector("#chapterList");
const chapterTitle = document.querySelector("#chapterTitle");
const chapterMeta = document.querySelector("#chapterMeta");
const chapterSummary = document.querySelector("#chapterSummary");
const verseCount = document.querySelector("#verseCount");
const verseContainer = document.querySelector("#verseContainer");
const verseTemplate = document.querySelector("#verseTemplate");

const normalize = (value) => (value ?? "").toString().replace(/\u00A0/g, " ").trim();

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function getTranslationsForVerse(verseId) {
  return state.translations.filter(
    (item) =>
      item.verse_id === verseId &&
      item.lang === state.currentLanguage &&
      (!state.currentAuthor || item.authorName === state.currentAuthor),
  );
}

function getAuthorOptions() {
  const names = new Set();
  state.translations.forEach((item) => {
    if (item.lang === state.currentLanguage && item.authorName) {
      names.add(item.authorName);
    }
  });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function buildChapterNav() {
  chapterList.innerHTML = "";
  state.chapters.forEach((chapter) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${chapter.chapter_number}. ${chapter.name_translation}`;
    if (chapter.chapter_number === state.currentChapter) button.classList.add("active");
    button.addEventListener("click", () => {
      state.currentChapter = chapter.chapter_number;
      chapterSelect.value = String(chapter.chapter_number);
      render();
      updateHash();
    });
    li.appendChild(button);
    chapterList.appendChild(li);
  });
}

function buildChapterSelect() {
  chapterSelect.innerHTML = "";
  state.chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = String(chapter.chapter_number);
    option.textContent = `${chapter.chapter_number}. ${chapter.name_translation}`;
    chapterSelect.appendChild(option);
  });
  chapterSelect.value = String(state.currentChapter);
}

function buildAuthorSelect() {
  const options = getAuthorOptions();
  if (!options.length) {
    authorSelect.innerHTML = "";
    state.currentAuthor = "";
    return;
  }

  if (!state.currentAuthor || !options.includes(state.currentAuthor)) {
    state.currentAuthor = options[0];
  }

  authorSelect.innerHTML = "";
  options.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    authorSelect.appendChild(option);
  });
  authorSelect.value = state.currentAuthor;
}

function renderSummary(chapter) {
  chapterTitle.textContent = `${chapter.chapter_number}. ${chapter.name_translation} (${chapter.name})`;
  chapterMeta.textContent = `${chapter.name_meaning} · ${chapter.verses_count} verses`;
  chapterSummary.textContent =
    state.currentLanguage === "hindi" ? chapter.chapter_summary_hindi : chapter.chapter_summary;
}

function renderVerses() {
  verseContainer.innerHTML = "";
  const chapterVerses = state.verses
    .filter((v) => v.chapter_number === state.currentChapter)
    .sort((a, b) => a.verse_number - b.verse_number);

  verseCount.textContent = `${chapterVerses.length} verses`;

  chapterVerses.forEach((verse) => {
    const card = verseTemplate.content.firstElementChild.cloneNode(true);
    const title = card.querySelector(".verse-title");
    const sanskrit = card.querySelector(".sanskrit");
    const iast = card.querySelector(".iast");
    const translation = card.querySelector(".translation");
    const wordMeanings = card.querySelector(".word-meanings");
    const audio = card.querySelector(".audio");

    title.textContent = `Verse ${verse.verse_number}`;
    sanskrit.textContent = normalize(verse.text);
    iast.textContent = normalize(verse.transliteration);

    const matchedTranslations = getTranslationsForVerse(verse.id);
    translation.textContent = matchedTranslations.length
      ? normalize(matchedTranslations[0].description)
      : "Translation unavailable for selected language/translator.";

    wordMeanings.textContent = normalize(verse.word_meanings);
    audio.src = `${DATA_BASE}/verse_recitation/${state.currentChapter}/${verse.verse_number}.mp3`;
    audio.setAttribute("aria-label", `Audio recitation for chapter ${state.currentChapter} verse ${verse.verse_number}`);

    verseContainer.appendChild(card);
  });
}

function updateHash() {
  window.location.hash = `chapter-${state.currentChapter}`;
}

function render() {
  const chapter = state.chapters.find((c) => c.chapter_number === state.currentChapter);
  if (!chapter) return;
  buildAuthorSelect();
  buildChapterNav();
  renderSummary(chapter);
  renderVerses();
}

function applyHash() {
  const match = window.location.hash.match(/chapter-(\d+)/);
  if (!match) return;
  const chapter = Number(match[1]);
  if (Number.isInteger(chapter) && chapter > 0 && chapter <= state.chapters.length) {
    state.currentChapter = chapter;
  }
}

async function init() {
  try {
    const [chapters, verses, translations] = await Promise.all([
      loadJson(`${DATA_BASE}/chapters.json`),
      loadJson(`${DATA_BASE}/verse.json`),
      loadJson(`${DATA_BASE}/translation.json`),
    ]);
    state.chapters = chapters;
    state.verses = verses;
    state.translations = translations;

    applyHash();
    buildChapterSelect();
    languageSelect.value = state.currentLanguage;
    render();
  } catch (error) {
    verseContainer.innerHTML = `<p>Unable to load data files. ${error.message}</p>`;
  }
}

chapterSelect.addEventListener("change", (event) => {
  state.currentChapter = Number(event.target.value);
  render();
  updateHash();
});

languageSelect.addEventListener("change", (event) => {
  state.currentLanguage = event.target.value;
  render();
});

authorSelect.addEventListener("change", (event) => {
  state.currentAuthor = event.target.value;
  renderVerses();
});

window.addEventListener("hashchange", () => {
  const previousChapter = state.currentChapter;
  applyHash();
  if (previousChapter !== state.currentChapter) {
    chapterSelect.value = String(state.currentChapter);
    render();
  }
});

init();
