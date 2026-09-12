# trad_char_study_web_app
A web app to quiz myself on traditional Chinese characters

After each submitted guess, browser speech synthesis reads the character in
Mandarin followed by its three example words, reading each word only once.
Playback stops when moving to the next question, ending practice manually, or
returning home. The final answer continues playing on the completion screen.
Audio requires browser speech synthesis support and an available Mandarin voice;
pronunciation and voice availability depend on the browser and operating system.
Only an explicitly selected Mandarin voice is used, with enhanced/natural voices
preferred. The app waits for delayed voice loading and shows a message if no
Mandarin voice is available instead of falling back to the default system voice.

Each submitted answer is saved immediately in browser localStorage, independently
of CSV export. The `traditional-character-history-v1` entry maps each traditional
character to its latest 10 results, ordered oldest to newest (`1` correct, `0`
incorrect). History persists across sessions on the same browser and site address;
clearing site data removes it. If storage is unavailable, practice continues with
in-memory history and a visible status message.

The optional consecutive-correct filter defaults to 5 and accepts an integer from 1 to 9. A character
is excluded only if it has at least that many recorded responses and all of its
most recent X responses were correct. Leave the field blank to disable the filter.
It combines with the priority and familiarity filters and applies when starting a
game. Unanswered questions do not change history.

## Run locally

From this directory, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Use a web server rather than opening `index.html` directly, because the game fetches the CSV.
