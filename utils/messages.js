// TOML Parser for languages
const TOML = require('@iarna/toml')
// os-lang for get lang of the computer
const { osLangSync } = require('os-lang')
// fs for read languages.toml
const fs = require("fs");

function getMessage(id) {
  let messages = TOML.parse(fs.readFileSync(__dirname + "/../languages.toml"));
  let lang = osLangSync().substring(0, 2).toLowerCase();
  messages = messages[lang];
  if (!messages) messages = messages["en"];
  if (!messages[id]) messages = messages["en"];
  return messages[id];
}

module.exports = getMessage;