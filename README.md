# Redpen UML

Practise **class**, **use case** and **ER** diagrams from exam-style scenarios, then press *Check* and get them marked: wrong arrow, missing line, flipped cardinality.

- **Frontend:** React 18 + Vite, [React Flow](https://reactflow.dev) canvas, Zustand store
- **Backend:** plain Node.js (no framework, no database server)
- **Database:** JSON files in [`/data`](./data), read-only
- **Your work:** held in **browser memory only**. Refresh the page and it is gone (a warning appears first). Use *Memory only → Save workspace* in the top bar to keep a copy as a file.
- **No login, no dashboard.**

## Run it locally

Needs Node 18 or newer.

```bash
npm run install:all     # installs the root and client dependencies
npm run dev             # API on :4000, UI on http://localhost:5173
```

Open **http://localhost:5173**. Vite forwards `/api` calls to the Node server.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Smoke-tests the API: every reference solution must score 100, exports and importers work |
| `npm run build` | Builds the UI into `client/dist` |
| `npm start` | After a build, serves UI + API together on http://localhost:4000 (closest to Vercel) |

## Deploy to Vercel through GitHub

1. Create an empty repository on GitHub.
2. In this folder:
   ```bash
   git init
   git add .
   git commit -m "Redpen UML"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On [vercel.com](https://vercel.com) choose **Add New → Project**, import the repository.
4. Leave the settings as they are. [`vercel.json`](./vercel.json) already sets the install command, build command (`client/dist`) and the SPA rewrite. Framework preset can stay on **Other**.
5. Click **Deploy**. Every push to `main` redeploys.

The `api/index.js` file turns the same Node handler used locally into a Vercel serverless function, so `/api/*` works with no extra setup.

## What each repository contributed

| Repository | What was learned and used |
| --- | --- |
| **umly** | Puzzle-based learning: scenario + goal + hints + objective, `build` and "model from text" modes, difficulty tiers, React Flow canvas with custom UML nodes, local-only drafts, export. Redpen adds its own scenarios and a name-matching checker (so drawing from scratch can be marked too). |
| **Apollon** | Editor UX: element palette on the left, properties panel on the right, undo/redo, 13-diagram thinking narrowed to the three exams use. PNG/SVG/JSON export. Notation-accurate line ends (diamonds, triangles, crow's feet) drawn as plain SVG so they survive export. |
| **swagger2puml** | *Import OpenAPI/Swagger → class diagram* (`allOf` becomes inheritance, `$ref` becomes an association, enums become enumerations) and *PlantUML output*. |
| **umlwriter** | *Source code → class diagram* (Java, TypeScript, PHP classes, interfaces, members, extends/implements, typed fields) and text output of diagrams (PlantUML and Mermaid). |

No code was copied from these projects. The ideas were re-implemented for this stack.

## How it works

```
client/                React app (Vite)
  src/store.js         in-memory boards, undo/redo, practice progress
  src/components/      canvas, nodes, edges, palette, inspector, dialogs
  src/pages/           Home, Practice, Play, Studio, Cheatsheet
server/
  handler.js           routes (used by both local server and Vercel)
  lib/checker.js       marks a diagram against a solution
  lib/exporters.js     diagram → PlantUML / Mermaid
  lib/importers.js     OpenAPI and source code → diagram
  index.js             local HTTP server (also serves client/dist)
api/index.js       Vercel entry point
data/
  puzzles.json         scenarios + reference solutions
  templates.json       starter diagrams for the Studio
  cheatsheet.json      notation reference
```

### Conventions the checker uses

Lines are stored as `source → target`:

| Relationship | Draw it from… to… |
| --- | --- |
| Generalization / realization | child → parent / class → interface |
| Aggregation / composition | **part → whole** (the diamond appears on the whole) |
| Include | base use case → included use case |
| Extend | extension → base use case |
| Association / ER relationship | either direction |

Boxes are matched **by name** (case, spaces and plurals ignored; aliases allowed), so a student can rename or add boxes freely.

## Add your own practice scenarios

Edit [`data/puzzles.json`](./data/puzzles.json) and restart the server. Each entry looks like:

```jsonc
{
  "id": "class-07-my-scenario",
  "number": 15,
  "title": "…", "diagramType": "class",          // class | usecase | er
  "mode": "build",                                // build = boxes given, model = draw from text
  "difficulty": "Easy",                           // Beginner | Easy | Intermediate | Advanced
  "category": "…", "scenario": "…", "goal": "…", "objective": "…",
  "hints": ["…", "…", "…"], "explanation": "…",
  "initial":  { "nodes": [], "edges": [] },       // what the student starts with
  "solution": { "nodes": [ … ], "edges": [ … ] }  // reference answer, same shape the editor saves
}
```

Easiest way to author one: draw the solution in the Studio, *Export → JSON*, and paste its `nodes` and `edges` into `solution`. Optional per node: `data.aliases` (other accepted names). Optional per edge: `data.accept` (extra accepted relationship types). Optional per puzzle: `checkMembers: true` for advisory tips about attributes.

## Notes

- Everything above was written without network access to install packages, so the first `npm run install:all` is also the first time the React app runs against the real `@xyflow/react`. The server, checker, exporters, importers and store logic are covered by `npm test` and my own tests; the node and edge components were rendered and checked visually against a stand-in for React Flow.
- If PNG export shows fallback fonts, that is `html-to-image` being unable to embed web fonts; the diagram itself is unaffected.
- YAML OpenAPI files need the `yaml` package, which is a normal dependency of the root `package.json`.
