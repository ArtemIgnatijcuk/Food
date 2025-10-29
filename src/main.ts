// Example TypeScript code
interface AppConfig {
    title: string;
    version: number;
}

class App {
    private config: AppConfig;

    constructor(config: AppConfig) {
        this.config = config;
    }

    init(): void {
        document.title = this.config.title;
    }
}

const app = new App({
    title: "My TypeScript App",
    version: 1.0
});

app.init();
