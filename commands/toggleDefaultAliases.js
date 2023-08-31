// createCommand for create the command for commander
const { createCommand } = require("commander");
// TOML Parser for languages
const TOML = require('@iarna/toml')
// fs for write languages.toml
const fs = require("fs");
// messages utils for get messages
const getMsg = require("../utils/messages");
// config utils for get config
const { getUserConfig, getConfigPath } = require("../utils/config");

function tda() {
  let settings = getUserConfig();
  if (!settings["options"]) settings["options"] = {};
  if (settings["options"]["defaultAliases"] === undefined) settings["options"]["defaultAliases"] = true;
  settings.options["defaultAliases"] = !settings.options["defaultAliases"];
  fs.writeFileSync(getConfigPath(), TOML.stringify(settings));

  console.log(getMsg("toggleDefaultAliases_confirmation").cyan.replace("{STATUS}", settings["options"]["defaultAliases"] ? getMsg("enable").green : getMsg("disable").red));
}

module.exports = createCommand("tda")
  .description(getMsg("toggleDefaultAliases_description"))
  .action(tda)