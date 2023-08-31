// createCommand for create Command for the CLI
const { createCommand } = require("commander");
// messages utils for get messages
const getMsg = require("../utils/messages");
// config utils for get config
const { getUserConfig, getConfigPath } = require("../utils/config");
// TOML Parser for languages
const TOML = require('@iarna/toml')
// fs for write languages.toml
const fs = require("fs");

function removeAlias(alias) {
  let settings = getUserConfig();
  if (!settings.aliases[alias]) return console.error(getMsg("alias_remove_not_found").replaceAll("{ALIAS}", alias).red);
  delete settings.aliases[alias];
  fs.writeFileSync(getConfigPath(), TOML.stringify(settings))

  console.log(getMsg("alias_remove_success").replaceAll("{ALIAS}", alias).green);
}

module.exports = createCommand("remove-alias")
  .description(getMsg("removeAlias_description"))
  .argument("<alias>", getMsg("alias_remove_arg"))
  .action(removeAlias)