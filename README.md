# UNUSED CSS FINDER 🔍🎛️

Web devs are constantly working on websites that just keep growing and changing due to redesigns, new components, etc. And, we eventually end up with a pretty large codebase of styles without knowing if all of them are currently being used.

## Support
If you find the UNUSED CSS FINDER valuable and want to support the project, consider [donating](hhttps://ko-fi.com/E1E0NCNON)! 🙏 


## SUGGESTED NODE 📜📦

```
node>=v15.14.0
```

## INSTALL

`npm i`


## HOW TO USE ⚙️🕷️

### 1. Install the packages `npm i` (`node>=v15.14.0`)  📜📦

### 2. Create a `settings.json` file on the root with the following attributes:
- `cssFile` | String: URL to the CSS file to use.
- `urls` | Array<String>: The URLs to check. You can add an xml sitemap or even a sitemap of sitemaps (Like Yoasts sitemap_index.xml)

### 3. Run the crawler with `npm run start`

### 4. Check the results with the ID that is logged in the console. The structure of the result is as follows:
  - status | `String`
  - urls | `String[]`: The tested URLS.
  - data | `Object`
    - usedSelectors | `Object[]`: Array of the selectors that are being used in the `urls`. Each selector will also specify the first `url` where it was found.
    - unusedSelectors | `String[]`: Array of the selectors that were not found in the provided `urls`.
