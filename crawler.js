const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const {pushUniques, logMessage, createDirectories} = require('./utils');

const checkURLs = async (urls) => {
  let res = [];

  if (!Array.isArray(urls))
    return [];

  for (i = 0; i < urls.length; i++) {
    if (isSitemap(urls[i])) {
      logMessage(`Extracting URLs from ${urls[i]}`, 'INFO');
      const sitemapURLs = await extractSitemapURLs(urls[i]);

      for (j = 0; j < sitemapURLs.length; j++) {
        //@TODO Use checkURLs() recursively.
        if (isSitemap(sitemapURLs[j])) {
          logMessage(`Extracting URLs from ${sitemapURLs[j]}`, 'INFO');
          res = pushUniques(res, await extractSitemapURLs(sitemapURLs[j]));
        }
        else {
          res = pushUniques(res, sitemapURLs)
        }
      }
    }
    else {
      res = pushUniques(res, urls[i]);
    }
  }

  return res;
}

const runCSSUsageAudit = async (id, urls, cssFile) => {
  const resultsPath = `./res/${id}`;
  const resFile = `${resultsPath}/res.json`;

  logMessage(`Starting CSS Coverage audit :). The id is: ${id}`, 'INFO', resultsPath);
  createDirectories(resultsPath);
  logMessage(`Extracting Selectors...`, 'INFO', resultsPath);

  const selectors = await getSelectors(cssFile);

  if (selectors.length === 0) {
    logMessage(`No selectors found.`, 'INFO', resultsPath);
    return;
  }

  logMessage(`Extracting URLs...`);
  urls = await checkURLs(urls);
  if (urls.length === 0) {
    logMessage(`No pages found.`, 'INFO', resultsPath);
    return;
  }

  logMessage(`# of Selectors: ${selectors.length}`, 'INFO', resultsPath);
  try {
    puppeteer.use(StealthPlugin());
    puppeteer.launch({ headless: true, args: ["--ignore-certificate-errors"] })
    .then(async browser => {


      logMessage(`# of URLs: ${urls.length}`, 'INFO', resultsPath);
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      await page.setDefaultNavigationTimeout(0);


      let unusedSelectors = selectors;
      let usedSelectors = [];
      let evalResults = [];
      // For testing;
      // unusedSelectors = unusedSelectors.slice(0, 20);
      // urls = urls.slice(0, 4);

      for (i = 0; i < urls.length; i++) {
        logMessage(`(${i} / ${urls.length}) - Looking up ${urls[i]}`, 'INFO', resultsPath);
        await page.goto(urls[i], {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        if (unusedSelectors.length <= 0) {
          logMessage(`All Selectors are being used!`, resultsPath);
          break;
        }

        evalResults = await page.evaluate((unusedSelectors, url) => {
          let unused = [];
          let used = [];

          for (j = 0; j < unusedSelectors.length; j++) {
            try {
              let res = document.querySelector(unusedSelectors[j]);
              if (!res) {
                unused.push(unusedSelectors[j]);
              }
              else {
                used.push({[unusedSelectors[j]]: url});
              }
            }
            catch (err) {
              console.log(err);
            }
          }

          return {used, unused};
        }, unusedSelectors, urls[i]);

        logMessage(`Unused Selectors after looking up ${urls[i]}: ${evalResults.unused.length}/${selectors.length} - ${((evalResults.unused.length/selectors.length) * 100).toFixed(2)}% [${unusedSelectors.length - evalResults.unused.length} found!]`, 'INFO', resultsPath);
        unusedSelectors = evalResults.unused;
        usedSelectors.push(...evalResults.used)
      }

      logMessage(`CSS Unused selectors finder is done! :)`, 'INFO', resultsPath);
      logMessage(`Unused Selectors Report: ${unusedSelectors.length}/${selectors.length} - ${((unusedSelectors.length/selectors.length) * 100).toFixed(2)}%`, 'INFO', resultsPath);
      const res = {status: 'SUCCESS', urls,  data: {usedSelectors, unusedSelectors}};
      await browser.close();

      writeResults(res, resFile);
      const fullPath = path.resolve(__dirname, resFile);
      logMessage(`See the results on ${fullPath}"`, 'end', resultsPath);


      // // Check if the file exists and get its details
      // fs.stat(fullPath, (err, stats) => {
      //   if (err) {
      //     console.error('Error reading file:', err);
      //   } else {
      //     openFileInBrowser(fullPath);
      //   }
      // });
    });
  }
  catch (e) {
    writeResults({status: 'ERROR', data: {message: e.message}}, resFile);
  }
}

const getSelectors = async (cssFile) => {
  let content = await fetch(cssFile).then(res => res.text());

  //Clean up CSS
  content = content.replace(/@charset(.*?);/gi, '');
  content = content.replace(/\n/gi, '');
  content = content.replace(/\/\*(.*?)\*\//gi, '')


  let matches = content.matchAll(/(\}|^)+([^@]*?)\s?\{/gi);
  let tmp = '';
  let selectors = [];

  for (const match of matches) {
    tmp = match[2];
    tmp = tmp.trim();

    if (tmp.indexOf('%') !== -1) {
      continue;
    }


    //@TODO Remove keyframes and other markup
    if (tmp === 'to') {
      continue;
    }

    if (tmp.indexOf(',') !== -1) {
      tmp = tmp.split(',');
      tmp.forEach(e => {
        e = e.trim();
        selectors = pushUniques(selectors, e.trim(), isValidSelector);
      })
    }
    else {
      selectors = pushUniques(selectors, tmp, isValidSelector);
    }

    //@TODO Check for "Invalid selectors"
  }

  return selectors;
}

const isValidSelector = (selector) => {
  const regex = /::?(hover|active|visited|disabled|before|after|focus|focus-within|-)/;

  return !regex.test(selector)
}

const openFileInBrowser = (filePath) => {
  const url = `file://${filePath}`;

  switch (process.platform) {
    case 'darwin':
      exec(`open "${url}"`);
      break;
    case 'win32':
      exec(`start "${url}"`);
      break;
    case 'linux':
      exec(`xdg-open "${url}"`);
      break;
    default:
      console.error('Unsupported platform. Cannot open file.');
  }
}

const writeResults = (content, fileName) => {
  fs.writeFileSync(fileName,JSON.stringify(content), {flags:'w'});
}

const isSitemap = (url) => {
  return /(.*)?\/(.*)?sitemap(.*)?\.xml$/.test(url);
}

// taken from https://github.com/Rowno/sitemap-urls
const extractSitemapURLs = async (url) => {
  const response = await fetch(url);
  const xml = await response.text();

  const urls = []
  const $ = cheerio.load(xml, { xmlMode: true })

  $('loc').each(function() {
    const url = $(this).text()

    if (!urls.includes(url)) {
      urls.push(url)
    }
  })

  logMessage(`Found ${urls.length} urls`);

  return urls;
}





module.exports = {runCSSUsageAudit};
