# The Apothecary's Ghost

A small, candlelit web app for the DEV Hacktoberfest Open-Source AI Challenge (Week 4, "Ghost in the Machine").
The ghost of a 19th-century apothecary, **Ambrose Quill** (a made-up character), tells the history of old remedies
(willow bark, cinchona and quinine, foxglove, laudanum, leeches, mercury, arsenic, cod liver oil), what each became in
modern pharmacy, and honours the people who came before.

> **History, not medical advice.** The ghost never gives doses, never recommends any remedy or medicine, calls the
> dangerous ones poisonous, and sends every health question to a doctor or a pharmacist.

## What is inside

- **The shop**: shelves of clickable jars, each opening a "Then and now" card with sources. A drifting ghost, wisps,
  moonlight, fog and candles. Respects reduced-motion settings.
- **Poison cabinet**: the four dangerous remedies (foxglove, laudanum, mercury, arsenic) with a clear warning.
- **Ofrenda**: ten people from pharmacy history, each with a short biography, sources and a candle to light. Light
  all ten and Ambrose thanks you. You can also **leave a remembrance** for someone you miss.
- **Quiz**: "Remedy or Poison?", built only from the fact sheet.
- **Certificate**: open all 8 jars and finish the quiz to earn an "Apprentice Apothecary" certificate with your name,
  downloadable as an image.
- **Ask the ghost**: chat with Ambrose. He answers **only from the checked fact sheet** in `data/facts.json`.

## Open-weight AI, nothing local

The chat uses **Gemma** (`gemma-4-26b-a4b-it`, an open-weight model) hosted by Google through the Gemini API, so no
model runs on your own machine. The server sends the approved system prompt plus the whole fact sheet, then checks both
your question and the model's answer:

- health, dose and "should I" questions never reach the model and get a fixed redirect to a doctor or pharmacist;
- attempts to change the rules get a fixed refusal;
- replies containing doses or advice are replaced by a refusal, and mentions of poisonous remedies always carry
  "Poisonous: never try at home.";
- the model's "thought" parts are never shown, requests are rate limited, and your API key stays on the server.

## Run it

You need Node.js 20 or newer. There are no dependencies to install.

1. Get a Gemini API key at <https://aistudio.google.com/apikey> (only needed for the chat; the rest works without it).
2. Copy `.env.example` to `.env` and put your key in it:

   ```
   GEMINI_API_KEY=your_key_here
   ```

   `.env` is git-ignored. Never commit or share your key.
3. Start the app and open <http://localhost:3000>:

   ```
   npm start
   ```

Optional settings in `.env`: `GEMMA_MODEL` (default `gemma-4-26b-a4b-it`; `gemma-4-31b-it` also works) and `PORT`.

## Tests

```
npm test
```

They cover the fact sheet and its approved corrections, the quiz, the server and its security headers, the chat guard
rails (with a mocked model, so no key is needed), the certificate and progress logic, the remembrance store, and that the
approved wording is exactly as signed off.

## Privacy

- Progress, your certificate name, lit candles and remembrances live **only in your browser** (localStorage).
  They are never sent anywhere. The code that handles them contains no network calls, and a test checks that.
- Chat questions go to this app's own server and from there to the Gemini API. Nothing is stored on the server.

## Sources

Every remedy and person in `data/facts.json` lists its sources (Britannica, PubMed Central, the NLM, the Science
Museum, the Science History Institute, the FDA, the Nobel Prize site). Dates that sources disagree on are worded
carefully or left out.

## License

[MIT](LICENSE)
