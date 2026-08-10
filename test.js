import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://localhost:5173/');
    console.log('Waiting 5s for load...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Clicking Spiritual Layer');
    try {
        await page.evaluate(() => {
            const btn = document.querySelector('[data-layer="spiritual"]');
            if (btn) {
                btn.click();
            } else {
                console.log("Button not found");
            }
        });
    } catch(e) {
        console.log("Error clicking:", e.message);
    }
    
    await new Promise(r => setTimeout(r, 2000));
    console.log('Done');
    await browser.close();
})();
