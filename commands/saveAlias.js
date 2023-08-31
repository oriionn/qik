// createCommand for create Command for the CLI
const { createCommand } = require("commander");
// TOML Parser for settings
const TOML = require('@iarna/toml')
// config utils for get config
const { getUserConfig, getConfigPath } = require("../utils/config");
// messages utils for get messages
const getMsg = require("../utils/messages");
// fs for set settings
const fs = require("fs");

function saveAlias(link, alias) {
  let defaultAliases = [ "react", "next", "tauri", "vue", "nuxt" ]
  let settings = getUserConfig();
  if (!settings.aliases) settings.aliases = {};

  if (defaultAliases.includes(alias)) return console.error(getMsg("setalias_defaultalias_error").replace("{ALIAS}", alias).red);
  settings.aliases[alias] = link;
  fs.writeFileSync(getConfigPath(), TOML.stringify(settings));

  console.log(getMsg("set_alias").replace("{ALIAS}", alias).cyan);
}

module.exports = createCommand("save-alias")
  .description(getMsg("saveAlias_description"))
  .argument("<link>", getMsg("link_arg"))
  .argument("<alias>", getMsg("alias_arg"))
  .action(saveAlias)