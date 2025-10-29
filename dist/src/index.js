"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// 0) Ініціалізація клієнта
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
// 1) Сервіси
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static('public'));
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
        // Using any here because the generated types from the SDK might differ across versions
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Reply with the single word: OK' }
            ],
            temperature: 0
        });
        return res.send(completion.choices[0].message.content);
    }
    catch (error) {
        if (error.response) {
            console.error('OpenAI API error:', error.response.status, error.response.data);
            return res
                .status(500)
                .send(`<pre>${error.response.status}\n${JSON.stringify(error.response.data, null, 2)}</pre>`);
        }
        else {
            console.error('Server error:', error.message);
            return res.status(500).send(`Server error: ${error.message}`);
        }
    }
});
// 5) Основний маршрут з форми
app.post('/suggest', async (req, res) => {
    const { ingredients, goal } = req.body;
    if (!ingredients || !goal)
        return res.status(400).json({ error: 'Missing fields' });
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a concise chef assistant. Respond in strict JSON.' },
                { role: 'user', content: `I have these ingredients: ${ingredients}.
Goal: ${goal}.
Return JSON exactly like:
{"recipes":[{"title":"...", "desc":"..."},{"title":"...", "desc":"..."},{"title":"...", "desc":"..."}]}` }
            ],
            temperature: 0.4,
            max_tokens: 300
        });
        let text = (completion.choices?.[0]?.message?.content || '').trim();
        // інколи модель обгортає код у ```json ... ```
        const m = text.match(/```json([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/);
        if (m)
            text = m[1].trim();
        const data = JSON.parse(text);
        if (!data.recipes)
            throw new Error('No recipes field in JSON');
        return res.json(data); // { recipes: [ {title, desc}, ... ] }
    }
    catch (error) {
        if (error.response) {
            console.error('OpenAI API error:', error.response.status, error.response.data);
            return res.status(500).json({ error: 'openai_error', details: error.response.data });
        }
        else {
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
    const dir = path_1.default.join(__dirname, '..', 'public');
    if (!fs_1.default.existsSync(dir))
        return null;
    const htmls = fs_1.default.readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith('.html'))
        .sort(); // перший за алфавітом
    return htmls[0] || null;
}
const DEFAULT_HTML = findDefaultHtml();
// 👉 Віддаємо його на "/"
app.get('/', (req, res) => {
    if (!DEFAULT_HTML)
        return res.status(404).send('No HTML file in /public');
    res.sendFile(path_1.default.join(__dirname, '..', 'public', DEFAULT_HTML));
});
//# sourceMappingURL=index.js.map