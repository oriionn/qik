#!/usr/bin/env node

const { Command, Option } = require("commander");
const pkg = require("./package.json");
const ascii_txt_gen = require("ascii-text-generator");
const getMsg = require("./utils/messages");

const init = require("./commands/init");
const saveAlias = require("./commands/saveAlias");
const toggleDefaultAliases = require("./commands/toggleDefaultAliases");
const program = new Command("qik");

program
  .version(pkg.version)
  .addHelpText("before", ascii_txt_gen("Qik", "2"))
  .description(getMsg("description"))
  .addCommand(saveAlias)
  .addCommand(init)
  .addCommand(toggleDefaultAliases)
  .parseAsync()
    .catch((e) => {
      console.log(e);
      process.exit(1)
    })