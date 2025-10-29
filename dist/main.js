"use strict";
class App {
    constructor(config) {
        this.config = config;
    }
    init() {
        document.title = this.config.title;
    }
}
const app = new App({
    title: "My TypeScript App",
    version: 1.0
});
app.init();
