# iterate-hackathon

## Chrome Extension with React, TypeScript, and Tailwind CSS

A modern Chrome extension built with React, TypeScript, and Tailwind CSS.

### Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

### Project Structure

```
iterate/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind CSS imports
├── index.html            # HTML template
├── manifest.json         # Chrome extension manifest
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

### Setup Instructions

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Development**:

   ```bash
   npm run dev
   ```

   This will build the extension in watch mode. The output will be in the `dist/` folder.

3. **Production Build**:

   ```bash
   npm run build
   ```

   This creates an optimized production build in the `dist/` folder.

4. **Load the Extension in Chrome**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist/` folder (not the root folder)
   - The extension should now appear in your extensions list

5. **Test the Extension**:
   - Click the extension icon in the Chrome toolbar
   - You should see the "Hello World" popup built with React
   - Click the "Click Me" button to see an interactive message

### Development Workflow

1. Make changes to files in the `src/` directory
2. Run `npm run dev` to watch for changes and rebuild automatically
3. Reload the extension in Chrome (click the reload icon on the extension card)
4. Test your changes

### Features

- ⚛️ React components with TypeScript
- 🎨 Tailwind CSS for styling
- 🔥 Hot module replacement during development
- 📦 Optimized production builds
- 🛠️ Type-safe development experience
