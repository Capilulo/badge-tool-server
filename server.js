const express = require('express');
const { chromium } = require('playwright');
const app = express();
const PORT = process.env.PORT || 3000;

// Permitir solicitudes desde cualquier origen (CORS)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static('.'));

app.get('/count-badges', async (req, res) => {
  const inputUrl = req.query.url;
  if (!inputUrl || !inputUrl.startsWith('https://www.encuentra24.com')) {
    return res.status(400).send({ error: 'URL inválida' });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let platinum = 0, gold = 0, plata = 0;
  let done = false;
  let logs = [`🔍 URL base: ${inputUrl}`];

  try {
    for (let pageNum = 1; pageNum <= 6 && !done; pageNum++) {
      const suffix = pageNum > 1 ? `.${pageNum}` : '';
      const url = inputUrl + suffix + '?q=number.50';
      logs.push(`📄 Página ${pageNum}: ${url}`);

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('div.d3-ad-tile', { timeout: 10000 });

      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1000);

      const cards = await page.$$('div.d3-ad-tile');
      logs.push(`🔹 ${cards.length} anuncios`);

      for (const card of cards) {
        const feat = await card.$('div.d3-ad-tile__feat');
        if (!feat) {
          logs.push(`⛔ Fin de destacados.`);
          done = true;
          break;
        }

        const title = (await feat.getAttribute('title') || '').toLowerCase();
        if (title.includes('platino')) platinum++;
        else if (title.includes('oro')) gold++;
        else if (title.includes('plata')) plata++;

        logs.push(`✅ Badge: ${title}`);
      }
    }
  } catch (err) {
    logs.push(`❌ Error: ${err.message}`);
  }

  await browser.close();

  logs.push(`\n🎯 Platino: ${platinum}`);
  logs.push(`🎯 Oro:     ${gold}`);
  logs.push(`🎯 Plata:   ${plata}`);
  logs.push(`📊 Total:   ${platinum + gold + plata}`);

  res.json({ platinum, gold, plata, logs });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
