import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './cli/e2e',
    fullyParallel: false,
    workers: 1,
    timeout: 30_000,
    expect: {
        timeout: 8_000,
    },
    use: {
        baseURL: 'http://localhost:8888',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:8888',
        reuseExistingServer: false,
        timeout: 30_000,
        stdout: 'pipe',
        stderr: 'pipe',
        gracefulShutdown: {
            signal: 'SIGINT',
            timeout: 1_000,
        },
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium-mobile',
            use: { ...devices['Pixel 7'] },
        },
    ],
});

