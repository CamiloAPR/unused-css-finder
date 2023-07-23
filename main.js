const {runCSSUsageAudit} = require('./crawler');
const settings = require("./settings.json");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


let uuid = new Date().toISOString().split('.')[0].replace(/:/g,'-');
const {cssFile, urls} = settings;

if (process.argv.includes('devUUID')) {
  uuid = 'dev';
}

runCSSUsageAudit(uuid, urls, cssFile);
