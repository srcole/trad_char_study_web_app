let characters = [], gameCharacters = [], currentCharacter = null, results = [];
let correctAnswers = 0, totalAnswers = 0, questionNumber = 0;
const byId = id => document.getElementById(id);
const homeScreen = byId("homeScreen"), gameScreen = byId("gameScreen");
const maxPriority = byId("maxPriority"), minKnown = byId("minKnown");
const exportCsv = byId("exportCsv");
const startButton = byId("startButton"), selectionSummary = byId("selectionSummary");
const traditionalCharacter = byId("traditionalCharacter"), answerInput = byId("answerInput");
const answerForm = byId("answerForm"), submitButton = byId("submitButton");
const feedback = byId("feedback"), resultMessage = byId("resultMessage");
const correctCharacter = byId("correctCharacter"), pinyin = byId("pinyin"), english = byId("english");
const nextButton = byId("nextButton"), correctCount = byId("correctCount");
const totalCount = byId("totalCount"), accuracy = byId("accuracy");
const progress = byId("progress"), errorMessage = byId("errorMessage");

async function loadCharacters() {
  try {
    const response = await fetch("trad_to_simp_char.csv");
    if (!response.ok) throw new Error("Could not load CSV file");
    characters = parseCSV(await response.text());
    if (!characters.length) throw new Error("No characters found in CSV");
    startButton.disabled = false;
    updateSelectionSummary();
  } catch (error) {
    console.error(error); selectionSummary.textContent = "";
    errorMessage.textContent = "Could not load trad_to_simp_char.csv. Try running this with a local web server.";
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
  selectionSummary.textContent = `${count} of ${characters.length} characters match these options.`;
  startButton.disabled = count === 0;
}

function startGame() {
  gameCharacters = selectedCharacters(); if (!gameCharacters.length) return;
  currentCharacter = null; results = []; correctAnswers = 0; totalAnswers = 0; questionNumber = 0;
  updateStats();
  homeScreen.classList.add("hidden"); gameScreen.classList.remove("hidden"); nextQuestion();
}

function nextQuestion() {
  if (!gameCharacters.length) return;
  let newCharacter;
  do { newCharacter = gameCharacters[Math.floor(Math.random() * gameCharacters.length)]; }
  while (gameCharacters.length > 1 && currentCharacter && newCharacter.idx === currentCharacter.idx);
  currentCharacter = newCharacter; questionNumber++;
  traditionalCharacter.textContent = currentCharacter.trad; progress.textContent = `Question ${questionNumber}`;
  answerInput.value = ""; answerInput.disabled = false; submitButton.disabled = false;
  feedback.classList.add("hidden"); answerInput.focus();
}

answerForm.addEventListener("submit", event => {
  event.preventDefault(); if (!currentCharacter) return;
  const userAnswer = answerInput.value.trim(); if (!userAnswer) return;
  const isCorrect = userAnswer === currentCharacter.simp;
  totalAnswers++; if (isCorrect) correctAnswers++;
  results.push({ idx: currentCharacter.idx, correct: isCorrect ? 1 : 0 });
  resultMessage.textContent = isCorrect ? "Correct!" : `Not quite. You answered: ${userAnswer}`;
  resultMessage.className = isCorrect ? "correct" : "incorrect";
  correctCharacter.textContent = currentCharacter.simp; pinyin.textContent = currentCharacter.pinyin || "—";
  english.textContent = currentCharacter.English || "—"; updateStats();
  answerInput.disabled = true; submitButton.disabled = true; feedback.classList.remove("hidden");
});

function updateStats() {
  correctCount.textContent = correctAnswers; totalCount.textContent = totalAnswers;
  accuracy.textContent = `${totalAnswers ? Math.round(correctAnswers / totalAnswers * 100) : 0}%`;
}

function makeResultsCSV() {
  const answerByIndex = new Map(results.map(result => [result.idx, result.correct]));
  const rows = [...characters]
    .sort((a, b) => Number(a.idx) - Number(b.idx))
    .map(character => `${character.idx},${answerByIndex.get(character.idx) ?? -1}`);
  return ["index,correct", ...rows].join("\n");
}

function endGame() {
  if (exportCsv.checked) {
    const csv = makeResultsCSV();
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = blobUrl;
    link.download = `traditional-character-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(blobUrl);
  }
  gameScreen.classList.add("hidden"); homeScreen.classList.remove("hidden"); currentCharacter = null;
}

answerInput.addEventListener("input", () => { answerInput.value = Array.from(answerInput.value).slice(0, 10).join(""); });
maxPriority.addEventListener("input", updateSelectionSummary); minKnown.addEventListener("input", updateSelectionSummary);
startButton.addEventListener("click", startGame); nextButton.addEventListener("click", nextQuestion);
byId("endGameButton").addEventListener("click", endGame);
loadCharacters();
