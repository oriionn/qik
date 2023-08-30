// Function for execute command
const {exec} = require("child_process");
// Axios for http request
const axios = require("axios");
// Colors for colors in terminal
const colors = require('colors');
// FS for deleting and create file
const fs = require("fs");
// fsExtra for recursive copy
const fsExtra = require('fs-extra');
// prompt for question in terminal
const prompt = require('prompt-sync')();
// config utils for get config
const { getUserConfig } = require("../utils/config");
// createCommand for create the command for commander
const { createCommand } = require("commander");

// Function to know if the link is valid
async function isValidGitLink(link) {
  let gitLinkPattern = /^(https?|git):\/\/.*?\.git$/;
  if (!gitLinkPattern.test(link)) return false;

  let req = await axios.get(link);
  return req.status === 200;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get the dir name with the git link
function getGitDirName(link) {
  let name = link.split("/")[link.split("/").length - 1].split(".");
  name.pop();
  return name.join(".");
}

function isGitHubLink(link) {
  const githubPattern = /^https:\/\/github\.com\/|git@github\.com:/;
  return githubPattern.test(link);
}

function extractOwnerAndRepo(link) {
  const githubPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)|git@github\.com:([^/]+)\/([^/]+)/;
  const matches = link.match(githubPattern);

  if (matches) {
    const owner = matches[1] || matches[3];
    const repo = matches[2] || matches[4];
    return { owner, repo };
  } else {
    return null;
  }
}

function updateEnvVariable(filePath, variableName, newValue) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file : ', err);
      return;
    }

    let updatedContent = '';
    let variableUpdated = false;

    const lines = data.split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2 && parts[0] === variableName) {
        updatedContent += `${variableName}=${newValue}\n`;
        variableUpdated = true;
      } else {
        updatedContent += line + '\n';
      }
    });

    if (!variableUpdated) {
      updatedContent += `${variableName}=${newValue}\n`;
    }

    fs.writeFileSync(filePath, updatedContent, 'utf8');
  });
}

const init = async (link, options) => {
  if (options.latestRelease && options.branch) return console.error(`The --branch and --latest-release options are not compatible with each other.`.red)

  let gitLink = link;
  let userConfig = getUserConfig();
  if (userConfig.aliases[gitLink]) gitLink = userConfig.aliases[gitLink];

  // Verify the link
  let iVGL = await isValidGitLink(gitLink);
  if (iVGL) {
    let command = `git clone ${gitLink}`;
    if (options.latestRelease === true) {
      if (!isGitHubLink(gitLink)) return console.error(`The --latest-release option is not compatible with this git service.`.red);

      let { owner, repo } = extractOwnerAndRepo(gitLink);
      let req = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}/releases/latest`);
      let infos = req.data;

      command += ` -b ${infos.tag_name}`;
    } else if (options.branch) {
      command += ` -b ${options.branch}`;
    }

    console.log(`Cloning repository...`.cyan);
    // Clone the repository
    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error(`An error occurred when cloning the repo.`.red);
        return console.error(error.message);
      }
      if (stderr || stdout) {
        let dir = getGitDirName(gitLink);

        if (fs.existsSync(`./${dir}`)) {
          console.log(`Repository cloned.`.cyan);
          if (fs.existsSync(`./${dir}/Qikfile`)) {
            console.log("Parsing Qikfile...".cyan);
            let config = fs.readFileSync(`${dir}/Qikfile`).toString();
            let lines = config.split("\n");

            const categories = {
              QUESTION: [],
              RUN: [],
              MESSAGE: []
            }
            let currentCategory = undefined;

            // Parse categories
            for (const line of lines) {
              if (line.startsWith("[")) {
                currentCategory = line.replaceAll(" ", "").slice(1, -1);
                if (currentCategory.endsWith("]")) currentCategory = currentCategory.slice(0, -1);
              } else if (currentCategory) {
                categories[currentCategory].push(line.replace("\r", ""));
              }
            }

            // Copy the repo in the main directory
            await fsExtra.copySync(`./${dir}`, `./`);
            fs.rmSync(`./${dir}`, { recursive: true, force: true });
            fs.rmSync(`./.git`, { recursive: true, force: true });
            fs.rmSync(`./Qikfile`, { force: true });

            console.log("Loading questions...".cyan)
            console.log(" ");

            // Questionning user
            for (const instruction of categories["QUESTION"]) {
              if (instruction.length !== 0) {
                const typePattern = /^\((.*?)\)/gm;

                let type = typePattern.exec(instruction)[1];
                let defaultPattern = /\[(.*?)\]/g;
                let defaulT = defaultPattern.exec(instruction.split(";")[0]);
                if (defaulT) defaulT = defaulT[1]; else defaulT = undefined;
                let content = "";
                if (defaulT) content = instruction.split(";")[0].split("]")[1];
                else content = instruction.split(";")[0].split(")")[1];

                if (content.startsWith(" ")) content = content.slice(1);
                if (content.endsWith(" ")) content = content.slice(0, -1);


                if (type === "yon") {
                  if (defaulT === "y") content += " (Y/n)";
                  else content += "(y/N)";
                } else if (type === "var") {
                  if (defaulT) content += ` (${defaulT})`;
                }

                await wait(1000)
                let answer = prompt(content.yellow + " ");
                if (type === "yon") {
                  YON(answer);
                } else if (type === "var") {
                  VAR(answer)
                }

                // function for yes or no questions
                function YON(answer) {
                  if (!answer) answer = defaulT;
                  let action = instruction.split(";")[instruction.split(";").length - 1];

                  let actionYes = action.split("§")[0];
                  let actionNo = action.split("§")[1];

                  let actions = []
                  if (answer.toLowerCase() === "y") actions = actionYes.split(":");
                  else actions = actionNo.split(":");

                  if (actions[0].toLowerCase().includes("edit_json")) {
                    let target = actions[1];
                    let fileTarget = target.match(/\w+\.json/)[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);

                    actions[2] = actions[2].split(")");
                    actions[2].pop()
                    actions[2] = actions[2].join(")");
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    eval(`const fs = require("fs");
                    let jsonFile = JSON.parse(fs.readFileSync('${fileTarget}'));
                    jsonFile${varTarget} = "${newValue}";
                    fs.writeFileSync('${fileTarget}', JSON.stringify(jsonFile, null, 4));`);
                  } else if (actions[0].toLowerCase().includes("exec")) {
                    categories.RUN.push(actions[1]);
                  } else if (actions[0].toLowerCase().includes("edit_toml")) {
                    let target = actions[1];
                    let fileTarget = target.match(/\w+\.toml/)[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);

                    actions[2] = actions[2].split(")");
                    actions[2].pop()
                    actions[2] = actions[2].join(")");
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    let parentTargetVar = varTarget.split("]");
                    if (parentTargetVar.length !== 1) {
                      parentTargetVar = `${parentTargetVar[0]}]`;
                    } else {
                      parentTargetVar = "no"
                    }

                    eval(`const fs = require("fs"); const TOML = require('@iarna/toml');
                    let tomlFile = TOML.parse(fs.readFileSync('${fileTarget}'));
                    if ('${parentTargetVar}' !== "no") tomlFile${parentTargetVar} = {};
                    tomlFile${varTarget} = "${newValue}";
                    fs.writeFileSync('${fileTarget}', TOML.stringify(tomlFile));`);
                  } else if (actions[0].toLowerCase().includes("edit_dotenv")) {
                    let target = actions[1];
                    let fileTarget = target.split("[")[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);

                    actions[2] = actions[2].split(")");
                    actions[2].pop()
                    actions[2] = actions[2].join(")");
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    varTarget = varTarget.slice(1, -1);
                    if (varTarget.endsWith(" ")) varTarget = varTarget.slice(0, -1);
                    if (varTarget.endsWith("]")) varTarget = varTarget.slice(0, -1);
                    fileTarget = fileTarget.replaceAll(" ", "");

                    eval(`updateEnvVariable('${fileTarget}', ${varTarget}, '${newValue}')`);
                  }
                }

                // function for var type question
                function VAR(answer) {
                  if (defaulT && !answer) answer = defaulT;
                  if (!defaulT && !answer) return;

                  let action = instruction.split(";")[instruction.split(";").length - 1];
                  let actions = action.split(":")

                  if (actions[0].toLowerCase().includes("edit_json")) {
                    let target = actions[1];
                    let fileTarget = target.match(/\w+\.json/)[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    eval(`const fs = require("fs");
                    let jsonFile = JSON.parse(fs.readFileSync('${fileTarget}'));
                    jsonFile${varTarget} = "${newValue.replaceAll("{RES}", answer)}";
                    fs.writeFileSync('${fileTarget}', JSON.stringify(jsonFile, null, 4));`);
                  } else if (actions[0].toLowerCase().includes("exec")) {
                    exec(actions[1], (error, stdout, stderr) => {
                      console.log(stdout);
                    })
                  } else if (actions[0].toLowerCase().includes("edit_toml")) {
                    let target = actions[1];
                    let fileTarget = target.match(/\w+\.toml/)[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    let parentTargetVar = varTarget.split("]");
                    if (parentTargetVar.length !== 1) {
                      parentTargetVar = `${parentTargetVar[0]}]`;
                    } else {
                      parentTargetVar = "no"
                    }

                    eval(`const fs = require("fs"); const TOML = require('@iarna/toml');
                    let tomlFile = TOML.parse(fs.readFileSync('${fileTarget}'));
                    if ('${parentTargetVar}' !== "no") tomlFile${parentTargetVar} = {};
                    tomlFile${varTarget} = "${newValue.replaceAll("{RES}", answer)}";
                    fs.writeFileSync('${fileTarget}', TOML.stringify(tomlFile));`);
                  } else if (actions[0].toLowerCase().includes("edit_dotenv")) {
                    let target = actions[1];
                    let fileTarget = target.split("[")[0];
                    let varTarget = target.replace(fileTarget, "");
                    if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);
                    let newValue = actions[2];
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);

                    varTarget = varTarget.slice(1, -1);
                    if (varTarget.endsWith(" ")) varTarget = varTarget.slice(0, -1);
                    if (varTarget.endsWith("]")) varTarget = varTarget.slice(0, -1);
                    fileTarget = fileTarget.replaceAll(" ", "");

                    eval(`updateEnvVariable('${fileTarget}', ${varTarget}, '${newValue.replaceAll("{RES}", answer)}')`);
                  }
                }
              }
            }

            // Write message
            console.log(" ");
            console.log("Message of the template's owner:".red);
            for (const msg of categories["MESSAGE"]) {
              if (msg.length !== 0) {
                console.log(msg.yellow)
              }
            }

            console.log(" ")
            console.log("Executing commands...".cyan)
            console.log(" ")

            // Executing commands
            for (const cmd of categories["RUN"]) {
              if (cmd.length !== 0) {
                await exec(cmd, (error, stdout, stderr) => {
                  if (error) return console.error(error);
                  if (stdout) console.log(stdout);
                  if (stderr) console.log(stderr);
                })
              }
            }
          } else {
            // If Qikfile doesn't exists.
            console.error(`No qik configuration files detected.`.red)
            fs.rmSync(`./${dir}`, {recursive: true, force: true});
          }
        } else {
          // If clone directory doesn't exists
          console.error(`An error occurred when cloning the repo.`.red);
        }
      }
    })
  } else {
    // If the git link is not valid.
    console.log(`The link you have entered is not valid.`.red);
  }
}

module.exports = createCommand("init")
  .description("Init a template")
  .argument("<link>", "The github link for the template.")
  .option("-b, --branch <branch>", "The branch of the github template")
  .option("-lr, --latest-release", "Use the latest release instead of the repository branch.")
  .action(init)