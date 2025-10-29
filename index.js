// index.js
const express = require('express');
const OpenAI = require('openai');
require('dotenv').config();

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 0) Ініціалізація клієнта
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1) Сервіси
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve public/app.ts transpiled to JS on the fly
app.get('/app.js', (req, res) => {
  const tsPath = path.join(__dirname, 'public', 'app.ts');
  if (!fs.existsSync(tsPath)) return res.status(404).send('/* app.ts not found */');

  try {
    const tsCode = fs.readFileSync(tsPath, 'utf8');
    let ts;
    try { ts = require('typescript'); } catch (e) {
      return res.status(500).type('application/javascript').send(`// TypeScript transpiler is not installed. Run 'npm install' or build the project.\nconsole.error('typescript not installed');`);
    }

    const out = ts.transpileModule(tsCode, {
      compilerOptions: {
        module: ts.ModuleKind.ES2015,
        target: ts.ScriptTarget.ES2015,
        jsx: ts.JsxEmit.React
      }
    });

    res.type('application/javascript').send(out.outputText);
  } catch (err) {
    console.error('Transpile error:', err);
    res.status(500).type('application/javascript').send(`// Transpile error\n/* ${String(err)} */`);
  }
});

// 2) Прості логи запитів
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 3) Діагностика: перевіряємо, чи ключ підхопився
app.get('/debug/env', (_req, res) => {
  return res.json({
    hasKey: !!process.env.OPENAI_API_KEY,
    port: PORT
  });
});

// 4) Діагностика: робимо мінімальний тест-запит до OpenAI
app.get('/debug/test', async (_req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // за потреби заміни на 'gpt-3.5-turbo'
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Reply with the single word: OK' }
      ],
      temperature: 0
    });
    return res.send(completion.choices[0].message.content);
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API error:', error.response.status, error.response.data);
      return res
        .status(500)
        .send(`<pre>${error.response.status}\n${JSON.stringify(error.response.data, null, 2)}</pre>`);
    } else {
      console.error('Server error:', error.message);
      return res.status(500).send(`Server error: ${error.message}`);
    }
  }
});

// 5) Основний маршрут з форми
app.post('/suggest', async (req, res) => {
  const { ingredients, goal } = req.body;
  if (!ingredients || !goal) return res.status(400).json({ error: 'Missing fields' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // або 'gpt-3.5-turbo'
      messages: [
        { role: 'system', content: 'You are a concise chef assistant. Respond in strict JSON.' },
        { role: 'user', content:
`I have these ingredients: ${ingredients}.
Goal: ${goal}.
Return JSON exactly like:
{"recipes":[{"title":"...", "desc":"..."},{"title":"...", "desc":"..."},{"title":"...", "desc":"..."}]}` }
      ],
      temperature: 0.4,
      max_tokens: 300
    });

    let text = completion.choices[0].message.content.trim();

    // інколи модель обгортає код у ```json ... ```
    const m = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/);
    if (m) text = m[1].trim();

    const data = JSON.parse(text);
    if (!data.recipes) throw new Error('No recipes field in JSON');

    return res.json(data); // { recipes: [ {title, desc}, ... ] }
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API error:', error.response.status, error.response.data);
      return res.status(500).json({ error: 'openai_error', details: error.response.data });
    } else {
      console.error('Server error:', error.message);
      return res.status(500).json({ error: 'server_error', message: error.message });
    }
  }
});


// 6) Старт
app.listen(PORT, () => {
  console.log('🔑 OPENAI key loaded:', !!process.env.OPENAI_API_KEY);
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});


// 👉 Знаходимо дефолтний HTML у папці public
function findDefaultHtml() {
  const dir = path.join(__dirname, 'public');
  if (!fs.existsSync(dir)) return null;
  const htmls = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.html'))
    .sort(); // перший за алфавітом
  return htmls[0] || null;
}

const DEFAULT_HTML = findDefaultHtml();

// 👉 Віддаємо його на "/"
app.get('/', (req, res) => {
  if (!DEFAULT_HTML) return res.status(404).send('No HTML file in /public');
  res.sendFile(path.join(__dirname, 'public', DEFAULT_HTML));
});
