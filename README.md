<div align="center">
  <img src="chrome_extension/src/public/tomo-ai-logo.PNG" alt="tomo AI" width="240" />
  <h2>tomo AI — Real-Time Interview Companion for Recruiters</h2>
  <p>Real-time transcription, next-question suggestions, live cues and warnings, performance scoring, and more.</p>
</div>

---

## Screenshots

Place screenshots in `docs/screenshots` and update the paths below.

![Home](docs/screenshots/home.png)
![Capture](docs/screenshots/capture.png)
![Completion](docs/screenshots/completion.png)

---

## Prerequisites
- Docker and Docker Compose
- Google Chrome (for the extension)

---

## Quick Start

1) Create a root `.env` file with required API keys:

```
ANTHROPIC_API_KEY=<your_key>
ELEVENLABS_API_KEY=<your_key>
```

2) Start all services:

```bash
./run.sh start
```

---

## Install the Chrome Extension (Developer Mode)

1) Build or confirm the extension `dist` exists (the compose services may generate assets as part of the flow).  
2) Load into Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable “Developer mode” (top-right toggle)
   - Click “Load unpacked”
   - Select the `chrome_extension/dist` folder

Once loaded, pin the extension and follow on-screen instructions.

---

## License

This project is licensed under the terms of the `LICENSE` file included in the repository.
