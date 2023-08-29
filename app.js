#!/usr/bin/env node

const { Command, Option } = require("commander");
const pkg = require("./package.json");
const ascii_txt_gen = require("ascii-text-generator");

const init = require("./commands/base");
const saveAlias = require("./commands/saveAlias");
const program = new Command("qik");

program
  .version(pkg.version)
  .addHelpText("before", ascii_txt_gen("Qik", "2"))
  .description("Qik is a CLI tool for use a Qik Template")
  .addCommand(saveAlias)
  .addCommand(init)
  .parseAsync()
    .catch((e) => {
      console.log(e);
      process.exit(1)
    })