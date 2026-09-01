let characters = [], gameCharacters = [], currentCharacter = null, results = [];
let correctAnswers = 0, totalAnswers = 0, questionNumber = 0;
const byId = id => document.getElementById(id);
const homeScreen = byId("homeScreen"), gameScreen = byId("gameScreen"), endScreen = byId("endScreen");
const maxPriority = byId("maxPriority"), minKnown = byId("minKnown");
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
  return characters.filter(character => {
    const priority = Number(character.priority), known = Number(character.known);
    return (priorityLimit === null || (character.priority !== "" && priority <= priorityLimit)) &&
      (knownLimit === null || known >= knownLimit);
  });
}

function updateSelectionSummary() {
  if (!characters.length) return;
  const count = selectedCharacters().length;
  selectionSummary.textContent = `共有 ${count} 個字詞符合設定（總計 ${characters.length} 個）。`;
  startButton.disabled = count === 0;
}

function startGame() {
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
  if (!gameCharacters.length) { endGame(true); return; }
  currentCharacter = gameCharacters.pop(); questionNumber++;
  traditionalCharacter.textContent = currentCharacter.trad;
  progress.textContent = `第 ${questionNumber} 題，共 ${questionNumber + gameCharacters.length} 題`;
  answerInput.value = ""; answerInput.disabled = false; submitButton.disabled = false;
  feedback.classList.add("hidden"); guessPanel.classList.remove("hidden"); answerInput.focus();
}

answerForm.addEventListener("submit", event => {
  event.preventDefault(); if (!currentCharacter) return;
  const userAnswer = answerInput.value.trim(); if (!userAnswer) return;
  const isCorrect = userAnswer === currentCharacter.simp;
  totalAnswers++; if (isCorrect) correctAnswers++;
  results.push({ idx: currentCharacter.idx, correct: isCorrect ? 1 : 0 });
  resultMessage.textContent = isCorrect ? "答對了！" : "";
  resultMessage.className = isCorrect ? "correct" : "hidden";
  feedbackTraditional.textContent = currentCharacter.trad;
  correctCharacter.textContent = currentCharacter.simp; pinyin.textContent = currentCharacter.pinyin || "—";
  english.textContent = currentCharacter.English || "—";
  renderExamples(currentCharacter.examples);
  updateStats();
  answerInput.disabled = true; submitButton.disabled = true;
  guessPanel.classList.add("hidden"); feedback.classList.remove("hidden");
  if (!gameCharacters.length) endGame(true);
});

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
    : "你的進度已記錄。準備好後即可返回首頁。";
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
  endScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
}

answerInput.addEventListener("input", () => { answerInput.value = Array.from(answerInput.value).slice(0, 10).join(""); });
maxPriority.addEventListener("input", updateSelectionSummary); minKnown.addEventListener("input", updateSelectionSummary);
startButton.addEventListener("click", startGame); nextButton.addEventListener("click", nextQuestion);
byId("endGameButton").addEventListener("click", () => endGame(false));
byId("homeButton").addEventListener("click", goHome);
loadCharacters();
