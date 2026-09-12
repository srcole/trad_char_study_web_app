let characters = [], gameCharacters = [], currentCharacter = null, results = [];
let correctAnswers = 0, totalAnswers = 0, questionNumber = 0;
const byId = id => document.getElementById(id);
const homeScreen = byId("homeScreen"), gameScreen = byId("gameScreen"), endScreen = byId("endScreen");
const maxPriority = byId("maxPriority"), minKnown = byId("minKnown");
const correctStreak = byId("correctStreak");
const exportCsv = byId("exportCsv");
const startButton = byId("startButton"), selectionSummary = byId("selectionSummary");
const traditionalCharacter = byId("traditionalCharacter"), answerInput = byId("answerInput");
const guessPanel = byId("guessPanel"), feedbackTraditional = byId("feedbackTraditional");
const answerForm = byId("answerForm"), submitButton = byId("submitButton");
const feedback = byId("feedback"), resultMessage = byId("resultMessage");
const correctCharacter = byId("correctCharacter"), pinyin = byId("pinyin"), english = byId("english");
const examples = byId("examples");
const nextButton = byId("nextButton"), correctCount = byId("correctCount");
const totalCount = byId("totalCount"), accuracy = byId("accuracy");
const progress = byId("progress"), errorMessage = byId("errorMessage");
const historyStatus = byId("historyStatus");
const HISTORY_KEY = "traditional-character-history-v1";
const HISTORY_LIMIT = 10;
let answerHistory = loadAnswerHistory();
let cancelVoiceWait = null;

function loadAnswerHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid history");
    const history = Object.create(null);
    for (const [trad, answers] of Object.entries(saved)) {
      if (Array.isArray(answers) && answers.every(answer => answer === 0 || answer === 1)) {
        history[trad] = answers.slice(-HISTORY_LIMIT);
      }
    }
    return history;
  } catch (error) {
    historyStatus.textContent = "無法讀取瀏覽器紀錄；本次仍可繼續練習。";
    return Object.create(null);
  }
}

function recordAnswer(trad, isCorrect) {
  // Oldest to newest: 1 = correct, 0 = incorrect.
  answerHistory[trad] = [...(answerHistory[trad] || []), isCorrect ? 1 : 0].slice(-HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(answerHistory));
    historyStatus.textContent = "作答紀錄已儲存於此瀏覽器。";
  } catch (error) {
    historyStatus.textContent = "無法儲存至瀏覽器；紀錄僅保留至本頁關閉或重新載入。";
  }
}

async function loadCharacters() {
  try {
    const response = await fetch("trad_to_simp_char.csv");
    if (!response.ok) throw new Error("無法載入資料檔案");
    characters = parseCSV(await response.text());
    if (!characters.length) throw new Error("資料檔案中沒有字詞");
    startButton.disabled = false;
    updateSelectionSummary();
  } catch (error) {
    console.error(error); selectionSummary.textContent = "";
    errorMessage.textContent = "無法載入字詞資料。請嘗試使用本機網頁伺服器執行此應用程式。";
  }
}

function parseCSV(text) {
  const rows = []; let row = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value); value = ""; if (row.some(cell => cell.length)) rows.push(row); row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift().map(header => header.trim());
  return rows
    .map(values => Object.fromEntries(headers.map((header, i) => [header, values[i]?.trim() || ""])))
    .filter(item => item.trad && item.simp)
    .map(item => ({ ...item, known: item.known || "5" }));
}

function selectedCharacters() {
  const priorityLimit = maxPriority.value === "" ? null : Number(maxPriority.value);
  const knownLimit = minKnown.value === "" ? null : Number(minKnown.value);
  const streakLimit = correctStreak.value === "" ? null : Number(correctStreak.value);
  return characters.filter(character => {
    const priority = Number(character.priority), known = Number(character.known);
    const history = answerHistory[character.trad] || [];
    const mastered = streakLimit !== null && history.length >= streakLimit &&
      history.slice(-streakLimit).every(answer => answer === 1);
    return (priorityLimit === null || (character.priority !== "" && priority <= priorityLimit)) &&
      (knownLimit === null || known >= knownLimit) && !mastered;
  });
}

function updateSelectionSummary() {
  if (!characters.length) return;
  if (!correctStreak.validity.valid) {
    selectionSummary.textContent = "連續答對次數請輸入 1 至 9 的整數，或留白以停用。";
    startButton.disabled = true;
    return;
  }
  const count = selectedCharacters().length;
  selectionSummary.textContent = `共有 ${count} 個字詞符合設定（總計 ${characters.length} 個）。`;
  startButton.disabled = count === 0;
}

function startGame() {
  if (!correctStreak.reportValidity()) return;
  gameCharacters = shuffle(selectedCharacters()); if (!gameCharacters.length) return;
  currentCharacter = null; results = []; correctAnswers = 0; totalAnswers = 0; questionNumber = 0;
  updateStats();
  homeScreen.classList.add("hidden"); endScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden"); nextQuestion();
}

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function nextQuestion() {
  stopPronunciation();
  if (!gameCharacters.length) { endGame(true); return; }
  currentCharacter = gameCharacters.pop(); questionNumber++;
  traditionalCharacter.textContent = currentCharacter.trad;
  progress.textContent = `第 ${questionNumber} 題，共 ${questionNumber + gameCharacters.length} 題`;
  answerInput.value = ""; answerInput.disabled = false; submitButton.disabled = false;
  feedback.classList.add("hidden"); guessPanel.classList.remove("hidden"); answerInput.focus();
}

answerForm.addEventListener("submit", event => {
  event.preventDefault(); if (!currentCharacter || submitButton.disabled) return;
  const userAnswer = answerInput.value.trim(); if (!userAnswer) return;
  const isCorrect = userAnswer === currentCharacter.simp;
  totalAnswers++; if (isCorrect) correctAnswers++;
  results.push({ idx: currentCharacter.idx, correct: isCorrect ? 1 : 0 });
  recordAnswer(currentCharacter.trad, isCorrect);
  resultMessage.textContent = isCorrect ? "答對了！" : "";
  resultMessage.className = isCorrect ? "correct" : "hidden";
  feedbackTraditional.textContent = currentCharacter.trad;
  correctCharacter.textContent = currentCharacter.simp; pinyin.textContent = currentCharacter.pinyin || "—";
  english.textContent = currentCharacter.English || "—";
  renderExamples(currentCharacter.examples);
  updateStats();
  answerInput.disabled = true; submitButton.disabled = true;
  guessPanel.classList.add("hidden"); feedback.classList.remove("hidden");
  speakAnswer(currentCharacter);
  if (!gameCharacters.length) endGame(true);
});

function stopPronunciation() {
  if (cancelVoiceWait) cancelVoiceWait();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speakAnswer(character) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const speech = window.speechSynthesis;
  stopPronunciation();
  const play = () => {
    const voice = speech.getVoices()
      .filter(voice => /^(?:zh$|zh[-_](?:CN|TW|SG|Hans|Hant)(?:[-_]|$)|cmn(?:[-_]|$))/i.test(voice.lang))
      .sort((a, b) => voiceScore(b) - voiceScore(a))[0];
    if (!voice) return false;
    if (cancelVoiceWait) cancelVoiceWait();
    byId("audioStatus").textContent = "";
    queuePronunciation(character, voice);
    return true;
  };
  if (play()) return;
  byId("audioStatus").textContent = "正在載入中文語音……";
  const onVoicesChanged = () => { play(); };
  const timeout = window.setTimeout(() => {
    if (play()) return;
    cancelVoiceWait();
    byId("audioStatus").textContent = "找不到國語語音。請在裝置的語音設定中安裝中文（台灣或中國）語音後重新載入。";
  }, 3000);
  cancelVoiceWait = () => {
    window.clearTimeout(timeout);
    speech.removeEventListener("voiceschanged", onVoicesChanged);
    cancelVoiceWait = null;
    byId("audioStatus").textContent = "";
  };
  speech.addEventListener("voiceschanged", onVoicesChanged);
}

function voiceScore(voice) {
  // Prefer enhanced voices when available, then Taiwan Mandarin.
  return (/natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0) +
    (!voice.localService ? 20 : 0) + (/[-_]TW$/i.test(voice.lang) ? 10 : 0);
}

function queuePronunciation(character, voice) {
  // Parentheses contain the same word in simplified Chinese; read each word once.
  const words = (character.examples || "").split(";")
    .map(word => word.replace(/\([^)]*\)|（[^）]*）/g, "").trim())
    .filter(Boolean).slice(0, 3);
  for (const text of [character.trad, ...words]) {
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }
}

function updateStats() {
  correctCount.textContent = correctAnswers; totalCount.textContent = totalAnswers;
  accuracy.textContent = `${totalAnswers ? Math.round(correctAnswers / totalAnswers * 100) : 0}%`;
}

function formatExamples(value) {
  if (!value) return "—";
  return value.split(";").map(example => example.trim()).filter(Boolean).join("\n");
}

function renderExamples(value) {
  const words = value?.split(";").map(word => word.trim()).filter(Boolean) || [];
  examples.replaceChildren();
  if (!words.length) {
    examples.textContent = "—";
    return;
  }
  words.forEach(word => {
    const line = document.createElement("span");
    line.className = "example-word";
    line.textContent = word;
    examples.appendChild(line);
  });
}

function makeResultsCSV() {
  const answerByIndex = new Map(results.map(result => [result.idx, result.correct]));
  const rows = [...characters]
    .sort((a, b) => Number(a.idx) - Number(b.idx))
    .map(character => `${character.idx},${answerByIndex.get(character.idx) ?? -1}`);
  return ["index,correct", ...rows].join("\n");
}

function endGame(completed = false) {
  if (!completed) stopPronunciation();
  if (exportCsv.checked) {
    const csv = makeResultsCSV();
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = blobUrl;
    link.download = `traditional-character-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(blobUrl);
  }
  const percent = totalAnswers ? Math.round(correctAnswers / totalAnswers * 100) : 0;
  byId("endTitle").textContent = completed ? "遊戲完成！" : "遊戲已結束";
  byId("endMessage").textContent = completed
    ? "你已回答所有可用字詞，做得很好！"
    : "本次練習已結束。準備好後即可返回首頁。";
  const finalExamples = byId("finalExamples");
  if (completed && currentCharacter?.examples) {
    finalExamples.textContent = `最後一題例詞：\n${formatExamples(currentCharacter.examples)}`;
    finalExamples.classList.remove("hidden");
  } else {
    finalExamples.textContent = "";
    finalExamples.classList.add("hidden");
  }
  byId("endCorrect").textContent = correctAnswers;
  byId("endAnswered").textContent = totalAnswers;
  byId("endAccuracy").textContent = `${percent}%`;
  gameScreen.classList.add("hidden"); endScreen.classList.remove("hidden"); currentCharacter = null;
}

function goHome() {
  stopPronunciation();
  endScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
  updateSelectionSummary();
}

answerInput.addEventListener("input", () => { answerInput.value = Array.from(answerInput.value).slice(0, 10).join(""); });
maxPriority.addEventListener("input", updateSelectionSummary); minKnown.addEventListener("input", updateSelectionSummary);
correctStreak.addEventListener("input", updateSelectionSummary);
startButton.addEventListener("click", startGame); nextButton.addEventListener("click", nextQuestion);
byId("endGameButton").addEventListener("click", () => endGame(false));
byId("homeButton").addEventListener("click", goHome);
window.addEventListener("pagehide", stopPronunciation);
// Trigger voice discovery before the first answer on browsers that load lazily.
if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
loadCharacters();
