const fs = require('fs');


//@TODO This could probably be achieved using another data structure
const pushUniques = (arr, val, validateFunction = (e) => true, log = false) => {

  if (!validateFunction(val))
    return arr;
  let res = [];
  let newValues = Array.isArray(val) ? val : [val];

  newValues.forEach(elem => {
    if (arr.indexOf(elem) === -1) {
      arr.push(elem);
    }
    else if (log) {
      //logMessage(`Found dupe '${val}'`, 'ERROR');
    }
  })

  return [...arr, ...res];
}

const logMessage = (text = '', label = 'INFO', resultsPath = null, date = null) => {
  if (date === null) {
    date = new Date().toJSON();
  }
  const logContent = `${date}||${text}`;
  if (!resultsPath) {
    console.log(logContent)
    return;
  }
  // var stream = fs.createWriteStream(`${resultsPath}/exec.log`, {flags:'as'});
  // stream.write(`${label.toLowerCase()}||${logContent}` + '\n');

  if (label.toUpperCase() === 'ERROR') {
    console.error(logContent);
  }
  else {
    console.info(logContent);
  }
}

const createDirectories = (resultsPath) => {
  if (!fs.existsSync(resultsPath)){
    fs.mkdirSync(resultsPath, {recursive: true});
  }
}

module.exports = {pushUniques, logMessage, createDirectories};
