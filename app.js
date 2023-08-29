#!/usr/bin/env node

const { Command, Option } = require("commander");
const pkg = require("./package.json");
const ascii_txt_gen = require("ascii-text-generator");

const parseBasic = require("./commands/base");
const parseSA = require("./commands/sa");
const program = new Command("qik");

async function parseCommand(cmd) {
  if (cmd._optionValues.saveAlias) {
    await parseSA(cmd);
  } else {
    await parseBasic(cmd);
  }
}

program
  .version(pkg.version)
  .addHelpText("before", ascii_txt_gen("Qik", "2"))
  .description("Qik is a CLI tool for use a Qik Template")
  .argument("<link>", "The git link for the template.")
  .option("-sa, --save-alias [alias]", "Set the alias for a template.")
  .parseAsync()
    .then(parseCommand)
    .catch((e) => {
      console.log(e);
      process.exit(1)
    })