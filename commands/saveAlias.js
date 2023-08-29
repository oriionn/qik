// createCommand for create Command for the CLI
const { createCommand } = require("commander");
// TOML Parser for settings
const TOML = require('@iarna/toml')
// config utils for get config
const { getUserConfig, getConfigPath } = require("../utils/config");
// fs for set settings
const fs = require("fs");

function saveAlias(link, alias) {
  let settings = getUserConfig();
  if (!settings.aliases) settings.aliases = {};

  settings.aliases[alias] = link;
  fs.writeFileSync(getConfigPath(), TOML.stringify(settings));

  console.log(`The alias "${alias}" has been saved in the parameters.`.cyan);
}

module.exports = createCommand("save-alias")
  .description("Save a alias for a template.")
  .argument("<link>", "The git link for the template.")
  .argument("<alias>", "The alias")
  .action(saveAlias)