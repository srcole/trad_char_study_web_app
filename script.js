let characters = [];
let currentCharacter = null;

let correctAnswers = 0;
let totalAnswers = 0;
let questionNumber = 0;

const traditionalCharacter = document.getElementById(
  "traditionalCharacter"
);

const answerInput = document.getElementById("answerInput");
const answerForm = document.getElementById("answerForm");

const feedback = document.getElementById("feedback");
const resultMessage = document.getElementById("resultMessage");

const correctCharacter = document.getElementById("correctCharacter");
const pinyin = document.getElementById("pinyin");
const english = document.getElementById("english");

const nextButton = document.getElementById("nextButton");

const correctCount = document.getElementById("correctCount");
const totalCount = document.getElementById("totalCount");
const accuracy = document.getElementById("accuracy");

const progress = document.getElementById("progress");
const errorMessage = document.getElementById("errorMessage");


// Load the CSV file
async function loadCharacters() {
  try {
    const response = await fetch("trad_to_simp_char.csv");

    if (!response.ok) {
      throw new Error("Could not load CSV file");
    }

    const text = await response.text();

    characters = parseCSV(text);

    if (characters.length === 0) {
      throw new Error("No characters found in CSV");
    }

    nextQuestion();

  } catch (error) {
    console.error(error);

    errorMessage.textContent =
      "Could not load trad_to_simp_char.csv. Try running this with a local web server.";
  }
}


// Simple CSV parser
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);

  const headers = lines[0].split(",").map(header => header.trim());

  return lines
    .slice(1)
    .map(line => {
      const values = line.split(",");

      const character = {};

      headers.forEach((header, index) => {
        character[header] = values[index]?.trim();
      });

      return character;
    })
    .filter(item => item.trad && item.simp);
}


// Choose a new random character
function nextQuestion() {

  if (!characters.length) return;

  let newCharacter;

  // Avoid immediately repeating the same character
  do {
    const randomIndex = Math.floor(
      Math.random() * characters.length
    );

    newCharacter = characters[randomIndex];

  } while (
    characters.length > 1 &&
    currentCharacter &&
    newCharacter.trad === currentCharacter.trad
  );

  currentCharacter = newCharacter;

  questionNumber++;

  traditionalCharacter.textContent = currentCharacter.trad;

  progress.textContent = `Question ${questionNumber}`;

  answerInput.value = "";
  answerInput.disabled = false;

  document.getElementById("submitButton").disabled = false;

  feedback.classList.add("hidden");

  answerInput.focus();
}


// Check the user's answer
answerForm.addEventListener("submit", function (event) {

  event.preventDefault();

  if (!currentCharacter) return;

  const userAnswer = answerInput.value.trim();

  if (!userAnswer) {
    return;
  }

  const isCorrect = userAnswer === currentCharacter.simp;

  totalAnswers++;

  if (isCorrect) {
    correctAnswers++;
    resultMessage.textContent = "Correct!";
    resultMessage.className = "correct";
  } else {
    resultMessage.textContent =
      `Not quite. You answered: ${userAnswer}`;
    resultMessage.className = "incorrect";
  }

  correctCharacter.textContent = currentCharacter.simp;
  pinyin.textContent = currentCharacter.pinyin || "—";
  english.textContent = currentCharacter.English || "—";

  updateStats();

  answerInput.disabled = true;

  document.getElementById("submitButton").disabled = true;

  feedback.classList.remove("hidden");
});


// Update score display
function updateStats() {

  correctCount.textContent = correctAnswers;

  totalCount.textContent = totalAnswers;

  const percent =
    totalAnswers === 0
      ? 0
      : Math.round((correctAnswers / totalAnswers) * 100);

  accuracy.textContent = `${percent}%`;
}


// Next button
nextButton.addEventListener("click", nextQuestion);


// Start the game
loadCharacters();