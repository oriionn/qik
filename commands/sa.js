// TOML Parser for settings
const TOML = require('@iarna/toml')
// config utils for get config
const { getUserConfig, getConfigPath } = require("../utils/config");
// fs for set settings
const fs = require("fs");

module.exports = async (cmd) => {
  let settings = getUserConfig();
  if (!settings.aliases) settings.aliases = {};

  let alias_name = cmd._optionValues.saveAlias;
  settings.aliases[alias_name] = cmd.args[0];

  fs.writeFileSync(getConfigPath(), TOML.stringify(settings));

  console.log(`The alias "${alias_name}" has been saved in the parameters.`.cyan);
}