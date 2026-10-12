// Static-only QA: external Playwright/axe/Lighthouse tooling, no application/database dependency.
const assert = require('node:assert/strict');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

(async () => {
    const root = path.resolve(__dirname, '..');
    const artifacts = path.join(os.tmpdir(), 'mintcoil-site-qa-results');
    await fs.mkdir(artifacts, { recursive: true });
    const publish = await fs.mkdtemp(path.join(os.tmpdir(), 'mintcoil-site-publish-'));
    await fs.mkdir(path.join(publish, 'preview'));
    await fs.copyFile(path.join(root, 'index.html'), path.join(publish, 'preview/index.html'));
    await fs.cp(path.join(root, 'assets'), path.join(publish, 'preview/assets'), { recursive: true });
    const server = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', publish], { env: { ...process.env, PYTHONUNBUFFERED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let browser;
    try {
        const port = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Static server did not start')), 10000);
            let output = '';
            server.on('error', reject);
            server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Static server exited ${code}`)); });
            server.stdout.on('data', data => {
                output += data;
                const match = output.match(/port (\d+)/);
                if (match) { clearTimeout(timeout); resolve(match[1]); }
            });
        });
        const url = `http://127.0.0.1:${port}/preview/`;
        browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        await context.addInitScript(() => {
            window.__startupCLS = 0;
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__startupCLS += entry.value;
            }).observe({ type: 'layout-shift', buffered: true });
        });
        const page = await context.newPage();
        // Delayed deferred JS must not briefly expand/collapse the mobile header.
        await page.route('**/assets/js/app.js', async route => {
            await new Promise(resolve => setTimeout(resolve, 750));
            await route.continue();
        });
        const errors = [];
        const assetBytes = new Map();
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('requestfailed', request => errors.push(`Failed: ${request.url()}`));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
        page.on('request', request => assert(request.url().startsWith(url), `External request: ${request.url()}`));
        for (const width of [1440, 1024, 768, 375, 320]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal((await page.goto(url)).status(), 200);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            assert(await page.evaluate(() => window.__startupCLS < .01), `Deferred JS caused startup layout shift at ${width}px`);
            assert.equal(await page.locator('h1').count(), 1);
            assert.equal(await page.locator('.cell').count(), 16);
            assert.equal(await page.locator('svg.icon').first().evaluate(node => getComputedStyle(node).fill), 'none', 'Sprite icons must not become solid silhouettes');
            assert(await page.locator('#contact-note').isVisible());
            assert.equal(await page.locator('.screen-card').count(), 4);
            assert.equal(await page.locator('.product-logo').count(), 2);
            assert(await page.locator('.product-logo').first().evaluate(image => image.complete && image.naturalWidth === 879 && image.naturalHeight === 259 && Math.abs(image.width / image.height - 879 / 259) < .1));
            assert.equal(await page.locator('.brand-name').count(), 0, 'Do not duplicate text beside a full wordmark');
            assert.equal(await page.locator('#faq .faq-list details').count(), 6);
            const documentFaq = page.locator('#faq details').filter({ hasText: 'รับเข้าหรือเบิกหลายม้วนพร้อมกันได้ไหม?' });
            assert((await documentFaq.locator('p').textContent()).includes('เมนูรับเข้าและเบิกออกใช้ฟอร์มเอกสาร 1–100'));
            assert((await documentFaq.locator('p').textContent()).includes('บันทึกเป็นเอกสาร 1 รายการ'));
            const attachmentFaq = page.locator('#faq details').filter({ hasText: 'รองรับการเบิกบางส่วนหรือแนบใบส่งของไหม?' });
            await attachmentFaq.locator('summary').focus();
            await page.keyboard.press('Enter');
            assert(await attachmentFaq.locator('p').isVisible());
            const attachmentText = await attachmentFaq.locator('p').innerText();
            for (const text of ['ไม่เบิกบางส่วน', 'เอกสารรับเข้า', 'PDF / JPEG / PNG', '1 ไฟล์', '5 MiB', 'Private', 'ดาวน์โหลดตามสิทธิ์', 'ต้องตรวจโฮสต์และทดสอบกับทีม']) assert(attachmentText.includes(text), `Missing attachment scope: ${text}`);
            assert(!(await page.locator('#faq').textContent()).includes('อยู่ระหว่าง'));
            assert.equal(await page.locator('#pricing .price-plan').count(), 4);
            for (const [model, plan, price, annual, users, warehouses, setup] of [
                ['subscription', 'core', '฿2,900', '฿29,000 / ปี · คิด 10 เดือน', '5 บัญชี', '2 แห่ง', '฿15,000'],
                ['subscription', 'business', '฿4,900', '฿49,000 / ปี · คิด 10 เดือน', '15 บัญชี', '6 แห่ง', '฿29,000'],
                ['license', 'core', '฿149,000', 'สิทธิ์ใช้งานถาวรตามสัญญา', '5 บัญชี', '2 แห่ง', '฿30,000'],
                ['license', 'business', '฿249,000', 'สิทธิ์ใช้งานถาวรตามสัญญา', '15 บัญชี', '6 แห่ง', '฿50,000'],
            ]) {
                const card = page.locator(`[data-model="${model}"][data-plan="${plan}"]`);
                assert((await card.locator('.price-amount').innerText()).startsWith(price));
                assert.equal(await card.locator('.price-annual').innerText(), annual);
                assert.deepEqual(await card.locator('dd').allTextContents(), [users, warehouses, setup]);
                assert.equal(await card.locator('.button').getAttribute('href'), '#contact');
                assert(await card.locator('.button').evaluate(node => node.getBoundingClientRect().height >= 44));
            }
            assert.deepEqual(await page.locator('[data-capacity="subscription"] dd').allTextContents(), ['฿200', '฿500']);
            assert.deepEqual(await page.locator('[data-capacity="license"] dd').allTextContents(), ['฿8,000', '฿15,000']);
            assert((await page.locator('#pricing-terms').innerText()).includes('ไม่รวม VAT'));
            assert((await page.locator('#pricing-terms').innerText()).includes('ไม่รวมย้ายข้อมูล'));
            assert((await page.locator('#pricing .pricing-note').last().innerText()).includes('18% ของค่า License / ปี'));
            assert.equal(await page.locator('.pricing-plans').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width < 768 ? 1 : 2);
            assert.equal(await page.locator('#contact a[href="mailto:sale@alexiasoft.co?subject=MintCoil%20Demo"]').count(), 1);
            assert.equal(await page.locator('#contact a[href="tel:+66616975959"]').count(), 1);
            assert(await page.locator('#getting-started .notice').isVisible());
            const question = page.locator('#faq details').first();
            await question.locator('summary').focus();
            await page.keyboard.press('Enter');
            assert(await question.evaluate(node => node.open));
            await page.keyboard.press('Enter');
            assert(!(await question.evaluate(node => node.open)));
            if (width >= 1100) {
                assert.equal(await page.locator('.hero').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);
                assert.equal(await page.locator('.button.primary').first().evaluate(node => getComputedStyle(node).borderRadius), '999px');
                const actionBottoms = await page.locator('#pricing .price-plan .button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().bottom));
                assert(Math.max(...actionBottoms) - Math.min(...actionBottoms) <= 2, 'Desktop pricing actions must align');
            }
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
            assert.equal(await page.locator('script[type="application/ld+json"]').evaluate(node => JSON.parse(node.textContent).creator.name), 'AlexiaSoft');
            assert.equal((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.length, 0, `Accessibility at ${width}px`);
            if (width < 768) {
                const toggle = page.getByRole('button', { name: 'เมนู', exact: true });
                assert(!(await page.locator('#site-nav').isVisible()));
                await toggle.click();
                assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
                await page.locator('#site-nav a').first().focus();
                await page.keyboard.press('Escape');
                assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
                assert(await toggle.evaluate(node => node === document.activeElement));
                await toggle.click();
                await page.locator('#site-nav a[href="#features"]').click();
                assert(!(await page.locator('#site-nav').isVisible()));
                assert.equal(await page.locator('#features').evaluate(node => node === document.activeElement), true);
                await toggle.click();
                await page.setViewportSize({ width: 1024, height: 900 });
                await page.waitForFunction(() => document.getElementById('menu-toggle').getAttribute('aria-expanded') === 'false');
                assert(await page.locator('#site-nav').isVisible());
                await page.setViewportSize({ width, height: 900 });
                assert(!(await page.locator('#site-nav').isVisible()));
            }
            if ([1440, 375].includes(width)) {
                for (const section of ['screens', 'pricing', 'getting-started', 'faq', 'contact']) {
                    await page.locator(`#${section}`).scrollIntoViewIfNeeded();
                    if (section === 'screens') await page.locator('#screens img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
                    await page.locator(`#${section}`).screenshot({ path: path.join(artifacts, `${section}-${width}.png`), style: '.site-header { visibility: hidden; }' });
                }
            }
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await page.screenshot({ path: path.join(artifacts, `site-${width}.png`) });
            await page.locator('#map-preview').screenshot({ path: path.join(artifacts, `map-${width}.png`) });
            console.log(`PASS: static page, links/menu/focus, no overflow and WCAG checks at ${width}px.`);
        }
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
        assert(await page.locator('.glass-card, .site-header').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).backdropFilter === 'none' && getComputedStyle(node).backgroundColor === 'rgb(255, 255, 255)')));
        assert.equal(await page.locator('.button').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
        await page.screenshot({ path: path.join(artifacts, 'site-solid-320.png') });
        await cdp.send('Emulation.setEmulatedMedia', { features: [] });
        await cdp.detach();
        for (const href of await page.locator('a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
            if (href.startsWith('#')) assert.equal(await page.locator(`[id="${href.slice(1)}"]`).count(), 1, `Missing target ${href}`);
            else assert([
                './', 'https://minterp.alexiasoft.co/', 'https://alexiasoft.co/',
                'mailto:sale@alexiasoft.co', 'mailto:sale@alexiasoft.co?subject=MintCoil%20Demo',
                'tel:+66616975959', ...['dashboard', 'layout', 'receive', 'reports'].map(name => `assets/images/screen-${name}.webp`),
            ].includes(href), `Unexpected outbound link ${href}`);
        }
        for (const asset of ['index.html', 'assets/css/style.css', 'assets/js/app.js', 'assets/images/mintcoil-mark.svg', 'assets/images/mintcoil_logo.png', 'assets/icons/symbols.svg', 'assets/images/social-card.svg']) {
            const response = await context.request.get(url + asset);
            assert.equal(response.status(), 200);
            assetBytes.set(asset, (await response.body()).length);
        }
        // Keep the original supplied RGBA file unchanged; do not spend its separate allowance on HTML/CSS/JS.
        const logoBytes = assetBytes.get('assets/images/mintcoil_logo.png');
        const coreBytes = [...assetBytes.values()].reduce((sum, bytes) => sum + bytes, 0) - logoBytes;
        assert(coreBytes < 65536, 'Non-PNG core assets exceed original 64KiB local budget');
        assert(logoBytes < 65536, 'Supplied PNG logo exceeds separate 64KiB local budget');
        assert(coreBytes + logoBytes < 131072, 'Static assets including supplied PNG logo exceed 128KiB local budget');
        let screenshotBytes = 0;
        for (const name of ['dashboard', 'layout', 'receive', 'reports']) {
            const src = `assets/images/screen-${name}.webp`;
            const response = await context.request.get(url + src);
            assert.equal(response.status(), 200);
            assert.equal(response.headers()['content-type'], 'image/webp');
            screenshotBytes += (await response.body()).length;
            assert.deepEqual(await page.evaluate(async src => {
                const image = new Image(); image.src = src; await image.decode();
                return [image.naturalWidth, image.naturalHeight];
            }, url + src), [1120, 790]);
            assert.equal(await page.locator(`img[src="${src}"]`).getAttribute('loading'), 'lazy');
        }
        assert(screenshotBytes < 524288, 'Four real-screen images exceed 512KiB budget');
        console.log(`PASS: four local lazy WebP screenshots, ${screenshotBytes} bytes, native decode 1120x790.`);
        // Social-only PNG is not loaded by the landing page; budget it separately.
        const social = await context.request.get(url + 'assets/images/social-card.png');
        assert.equal(social.status(), 200);
        assert.equal(social.headers()['content-type'], 'image/png');
        const socialBytes = await social.body();
        assert.deepEqual(socialBytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        assert(socialBytes.length < 262144, 'Social PNG exceeds 256KiB budget');
        assert.deepEqual(await page.evaluate(async src => {
            const image = new Image();
            image.src = src;
            await image.decode();
            return [image.naturalWidth, image.naturalHeight];
        }, url + 'assets/images/social-card.png'), [1200, 630]);
        console.log(`PASS: social PNG HTTP/MIME/signature/browser decode 1200x630, ${socialBytes.length} bytes (not page payload).`);
        assert.equal((await context.cookies()).length, 0);
        assert.deepEqual(errors, []);
        const fallback = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
        const noJs = await fallback.newPage();
        await noJs.goto(url);
        assert(await noJs.locator('#site-nav').isVisible());
        assert(await noJs.locator('#menu-toggle').isHidden());
        await noJs.locator('#site-nav a[href="#pricing"]').click();
        assert(noJs.url().endsWith('#pricing'));
        assert.equal(await noJs.locator('#pricing .price-plan').count(), 4);
        await noJs.locator('#faq details').filter({ hasText: 'รองรับการเบิกบางส่วนหรือแนบใบส่งของไหม?' }).locator('summary').click();
        assert(await noJs.getByText('ทำรายการเป็นม้วนเต็ม ไม่เบิกบางส่วน', { exact: false }).isVisible());
        await noJs.locator('#site-nav a[href="#contact"]').click();
        assert(noJs.url().endsWith('#contact'));
        assert(await noJs.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await fallback.close();
        await page.goto(url);
        await page.keyboard.press('Tab');
        assert(await page.locator('.skip-link').evaluate(node => node === document.activeElement));
        await page.keyboard.press('Enter');
        assert(await page.locator('#main').evaluate(node => node === document.activeElement));
        await browser.close();
        browser = null;
        console.log(`PASS: local assets ${[...assetBytes.values()].reduce((sum, bytes) => sum + bytes, 0)} bytes, no external requests/cookies/errors, no-JS and skip-link fallback.`);
        if (process.env.RUN_LIGHTHOUSE === '1') {
            const output = path.join(artifacts, 'lighthouse-mobile.json');
            await promisify(execFile)(process.execPath, [require.resolve('lighthouse/cli/index.js'), url, '--quiet', '--output=json', `--output-path=${output}`, '--chrome-flags=--headless --no-sandbox'], { timeout: 120000, env: { ...process.env, CHROME_PATH: process.env.BROWSER_EXECUTABLE } });
            const report = JSON.parse(await fs.readFile(output, 'utf8'));
            assert(!report.runtimeError, JSON.stringify(report.runtimeError));
            for (const name of ['performance', 'accessibility', 'best-practices', 'seo']) {
                assert(report.categories[name].score >= .9, `${name}: ${report.categories[name].score}`);
                console.log(`LIGHTHOUSE mobile ${name}: ${Math.round(report.categories[name].score * 100)}`);
            }
            console.log(`LIGHTHOUSE local simulated mobile: LCP ${report.audits['largest-contentful-paint'].displayValue}, CLS ${report.audits['cumulative-layout-shift'].displayValue}. Not real-device/network/production certification.`);
        }
        console.log(`Artifacts: ${artifacts}`);
    } finally {
        await browser?.close();
        server.kill('SIGTERM');
        await fs.rm(publish, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
