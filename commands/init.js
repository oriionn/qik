// Function for execute command
const {exec, execSync} = require("child_process");
// Axios for http request
const axios = require("axios");
// Colors for colors in terminal
const colors = require('colors');
// FS for deleting and create file
const fs = require("fs");
// fsExtra for recursive copy
const fsExtra = require('fs-extra');
// inquirer for question in terminal
const inquirer = require('inquirer');
// config utils for get config
const { getUserConfig } = require("../utils/config");
// messages utils for get messages
const getMsg = require("../utils/messages");
// createCommand for create the command for commander
const { createCommand } = require("commander");
// jsonc for edit jsonc files
const jsonc = require('jsonc');

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

// Function for verify if it is a valid git link
function isGitHubLink(link) {
  const githubPattern = /^https:\/\/github\.com\/|git@github\.com:/;
  return githubPattern.test(link);
}

// Function for extract the name of the owner and the repo
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

// Function for edit env file
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

// Patterns for extract file for edit
const patterns = {
  json: /\w+\.json/,
  toml: /\w+\.toml/,
  cjson: /\w+\.jsonc/
}

// Function for edit file
function editFile(actions, type, ext, answer) {
  let target = actions[1];
  let fileTarget = "";
  if (ext === "dotenv") fileTarget = target.split("[")[0];
  else fileTarget = target.match(patterns[ext])[0];
  let varTarget = target.replace(fileTarget, "");
  if (varTarget.startsWith(" ")) varTarget = varTarget.slice(1);

  if (type === "yon") {
    actions[2] = actions[2].split(")");
    actions[2].pop()
    actions[2] = actions[2].join(")");
  }
  let newValue = actions[2];
  if (newValue.startsWith(" ")) newValue = newValue.slice(1);

  if (ext === "json") {
    eval(`const fs = require("fs"); let jsonFile = JSON.parse(fs.readFileSync('${fileTarget}')); jsonFile${varTarget} = "${newValue.replaceAll("{RES}", `${answer}`)}"; fs.writeFileSync('${fileTarget}', JSON.stringify(jsonFile, null, 4));`);
  } else if (ext === "toml") {
    let parentTargetVar = varTarget.split("]");
    if (parentTargetVar.length !== 1) {
      parentTargetVar = `${parentTargetVar[0]}]`;
    } else {
      parentTargetVar = "no"
    }

    eval(`const fs = require("fs"); const TOML = require('@iarna/toml'); let tomlFile = TOML.parse(fs.readFileSync('${fileTarget}')); if ('${parentTargetVar}' !== "no") tomlFile${parentTargetVar} = {}; tomlFile${varTarget} = "${newValue.replaceAll("{RES}", answer)}"; fs.writeFileSync('${fileTarget}', TOML.stringify(tomlFile));`);
  } else if (ext === "dotenv") {
    varTarget = varTarget.slice(1, -1);
    if (varTarget.endsWith(" ")) varTarget = varTarget.slice(0, -1);
    if (varTarget.endsWith("]")) varTarget = varTarget.slice(0, -1);
    fileTarget = fileTarget.replaceAll(" ", "");
    eval(`updateEnvVariable('${fileTarget}', ${varTarget}, '${newValue.replaceAll("{RES}", answer)}')`);
  } else if (ext === "cjson") {
    eval(`const fs = require("fs"); const jsonc = require("jsonc"); let jsonFile = jsonc.parse(fs.readFileSync('${fileTarget}').toString()); jsonFile${varTarget} = "${newValue.replaceAll("{RES}", `${answer}`)}"; fs.writeFileSync('${fileTarget}', JSON.stringify(jsonFile, null, 4));`);
  }

  return { fileTarget, varTarget, newValue };
}

const init = async (link, options) => {
  if (options.latestRelease && options.branch) return console.error(getMsg("lr_and_branch_not_compatible").red)

  let gitLink = link;
  let userConfig = getUserConfig();
  if (userConfig.aliases && userConfig.aliases[gitLink]) gitLink = userConfig.aliases[gitLink];
  if (!userConfig.options) { userConfig.options = {}; userConfig.options["defaultAliases"] = true; }
  if (userConfig.options && userConfig.options["defaultAliases"]) {
    if (gitLink === "react") {
      // Request project name
      let projectName = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: getMsg("project_name"),
        validate: (value) => {
          if (value.length === 0) return getMsg("project_name_required");
          return true;
        }
      }]).then(answers => answers.projectName);

      return execSync(`npx create-react-app ${projectName}`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "next") {
      return execSync(`npx create-next-app`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "tauri") {
      return execSync(`npm create tauri-app@latest`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "vue") {
      return execSync(`npm create vue@latest`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "nuxt") {
      // Request project name
      let projectName = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: getMsg("project_name"),
        validate: (value) => {
          if (value.length === 0) return getMsg("project_name_required");
          return true;
        }
      }]).then(answers => answers.projectName)

      return execSync(`npx nuxi@latest init ${projectName}`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "vite") {
      return execSync(`npm create vite@latest`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "astro") {
      return execSync(`npm create astro@latest`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    } else if (gitLink === "svelte") {
      // Request project name
      let projectName = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: getMsg("project_name"),
        validate: (value) => {
          if (value.length === 0) return getMsg("project_name_required");
          return true;
        }
      }]).then(answers => answers.projectName)

      return execSync(`npm create svelte@latest ${projectName}`, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
    }
  }

  // If there is no git link, but there is a Qikfile
  if (!gitLink && fs.existsSync("./Qikfile")) var doesQikFileAlreadyExist = true;
  else var doesQikFileAlreadyExist = false;

  // Verify the link
  if (doesQikFileAlreadyExist || await isValidGitLink(gitLink)) {
    // Folder name
    let dirName = doesQikFileAlreadyExist ? "." : ('./' + getGitDirName(gitLink));

    // Clone the repository if there is no Qikfile
    if (!doesQikFileAlreadyExist) {
      let command = `git clone ${gitLink}`;
      if (options.latestRelease === true) {
        if (!isGitHubLink(gitLink)) return console.error(getMsg("lr_not_compatible").red);

        let { owner, repo } = extractOwnerAndRepo(gitLink);
        let req = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}/releases/latest`);
        let infos = req.data;

        if (infos.tag_name) {
          command += ` -b ${infos.tag_name}`;
        }
      } else if (options.branch) {
        command += ` -b ${options.branch}`;
      }

      console.log(getMsg("cloning_repository").cyan);
      await new Promise((resolve, reject) => {
        // Clone the repository
        exec(command, async (error, stdout) => {
          if (error) {
            console.error(getMsg("error_when_cloning").red);
            return console.error(error.message);
          }
          resolve() // we wait for THIS to finish
        })
      })
    }

    // If the directory exists
    if (fs.existsSync(dirName)) {
      if(!doesQikFileAlreadyExist) console.log(getMsg("repository_cloned").cyan); // only print if we cloned the repo
      if (fs.existsSync(`${dirName}/Qikfile`)) {
        console.log(getMsg("parsing_qikfile").cyan);
        let config = fs.readFileSync(`${dirName}/Qikfile`).toString();
        let lines = config.split("\n");
        const variables = {};

        const categories = {
          QUESTION: [],
          RUN: [],
          MESSAGE: [],
          WARNING_MESSAGE: [],
          VAR: []
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

        // Warning for directory
        console.log(" ");
        console.log(getMsg("warning_before_init").replaceAll("{CWD}", process.cwd()).red)
        if(!(await inquirer.prompt([{
          type: "confirm",
          name: "continue",
          message: getMsg("continue"),
          default: false
        }])).continue){ process.exit() }

        // Warning Message
        if (categories.WARNING_MESSAGE.length !== 0) {
          console.log(" ");
          console.log(getMsg("warning_from_owner").red);
          for (const warning of categories["WARNING_MESSAGE"]) {
            if (warning.length !== 0) {
              console.log(`${warning}`.red);
            }
          }
          if(!(await inquirer.prompt([{
            type: "confirm",
            name: "continue",
            message: getMsg("continue"),
            default: false
          }])).continue) { fs.rmSync(`${dirName}`, { recursive: true, force: true }); process.exit(); }
        }

        // Copy the repo in the main directory
        if(dirName != '.'){
          await fsExtra.copySync(`${dirName}`, `./`);
          fs.rmSync(`${dirName}`, { recursive: true, force: true });
        }
        if(!doesQikFileAlreadyExist) fs.rmSync(`./Qikfile`, { force: true });

        for (const variable in categories["VAR"]) {
            if (variable.length >= 1) {
                let varName = categories["VAR"][variable].split(":")[0].replaceAll(" ", "");
                let varValue = categories["VAR"][variable].split(":")[1];
                if (varValue !== undefined) {
                  if (varValue.startsWith(" ")) varValue = varValue.slice(1);
                  variables[varName] = varValue;
                }
            }
        }

        // Questions
        if (categories.QUESTION.length !== 0) {
          console.log(" ");
          console.log(getMsg("loading_questions").cyan)

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

              if (type === "sel") {
                if (!defaulT) return console.error(getMsg("sel_not_default").red);
                let choices = defaulT.split(",");
                let choicesContent = "";
                let i = 0;
                for (const choice of choices) {
                  i++;
                  if (i === 1) choicesContent += `${choice}`;
                  else if (i !== choices.length) choicesContent += `, ${choice}`;
                  else choicesContent += ` ${getMsg("or")} ${choice}`;
                }
              }

              async function re() {
                if (type === "yon") {
                  let { answer } = await inquirer.prompt([{
                    type: "confirm",
                    name: "answer",
                    message: content,
                    default: defaulT === "y"
                  }])

                  YON(answer);
                } else if (type === "var") {
                  let { answer } = await inquirer.prompt([{
                    type: "input",
                    name: "answer",
                    message: content,
                    default: defaulT
                  }])

                  VAR(answer)
                } else if (type === "sel") {
                  let { answer } = await inquirer.prompt([{
                    type: "list",
                    name: "answer",
                    message: content,
                    choices: defaulT.split(",")
                  }])

                  VAR(answer);
                }

                // function for yes or no questions
                function YON(answer) {
                  let action = instruction.split(";")[instruction.split(";").length - 1];

                  let actionYes = action.split("§")[0];
                  let actionNo = action.split("§")[1];

                  let actions = []
                  if (answer) actions = actionYes.split(":");
                  else actions = actionNo.split(":");

                  if (actions[0].toLowerCase().includes("edit_jsonc")) {
                    editFile(actions, "yon", "cjson", answer);
                  } else if (actions[0].toLowerCase().includes("edit_json")) {
                    editFile(actions, "yon", "json", answer)
                  } else if (actions[0].toLowerCase().includes("exec")) {
                    categories.RUN.push(actions[1]);
                  } else if (actions[0].toLowerCase().includes("edit_toml")) {
                    editFile(actions, "yon", "toml", answer);
                  } else if (actions[0].toLowerCase().includes("edit_dotenv")) {
                    editFile(actions, "yon", "dotenv", answer)
                  } else if (actions[0].toLowerCase().includes("edit_var")) {
                    let vaR = actions[1].replaceAll(" ", "");
                    let newValue = actions[2];
                    if (newValue.endsWith(" ")) newValue = newValue.slice(0, -1);
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);
                    variables[vaR] = newValue;
                  }
                  // NOT EXECUTION : VOID
                }

                // function for var type question
                function VAR(answer) {
                  if (defaulT && !answer) answer = defaulT;
                  if (!defaulT && !answer) return;

                  let action = instruction.split(";")[instruction.split(";").length - 1];
                  let actions = action.split(":")

                  if (actions[0].toLowerCase().includes("edit_jsonc")) {
                    editFile(actions, "var", "cjson", answer);
                  } else if (actions[0].toLowerCase().includes("edit_json")) {
                    editFile(actions, "var", "json", answer)
                  } else if (actions[0].toLowerCase().includes("exec")) {
                    exec(actions[1], (error, stdout, stderr) => {
                      console.log(stdout);
                    })
                  } else if (actions[0].toLowerCase().includes("edit_toml")) {
                    editFile(actions, "var", "toml", answer);
                  } else if (actions[0].toLowerCase().includes("edit_dotenv")) {
                    editFile(actions, "var", "dotenv", answer)
                  } else if (actions[0].toLowerCase().includes("edit_var")) {
                    let vaR = actions[1].replaceAll(" ", "");
                    let newValue = actions[2];
                    if (newValue.endsWith(" ")) newValue = newValue.slice(0, -1);
                    if (newValue.startsWith(" ")) newValue = newValue.slice(1);
                    variables[vaR] = newValue.replaceAll("{RES}", answer);
                  }
                  // NOT EXECUTION : VOID
                }
              }
              await re();
            }
          }
        }

        // Write message
        if (categories.MESSAGE.length !== 0) {
          console.log(" ");
          console.log(getMsg("message_from_owner").cyan);
          for (const msg of categories["MESSAGE"]) {
            if (msg.length !== 0) {
              console.log(msg.yellow)
            }
          }
        }

        if (categories.RUN.length !== 0) {
          console.log(" ")
          console.log(getMsg("executing_commands").cyan)
          console.log(" ")

          // Executing commands
          await wait(1000)
          for (let cmd of categories["RUN"]) {
            if (cmd.length !== 0) {
              let conditionPattern = /^\((.*?)\)/gm;
              let condition = conditionPattern.exec(cmd);
              if (condition) condition = condition[1]; else condition = undefined;
              let running = false;
              if (condition) {
                let varName = condition.split("==")[0].replaceAll(" ", "");
                let varValue = condition.split("==")[1];
                if (varValue.startsWith(" ")) varValue = varValue.slice(1);
                if (varValue.endsWith(" ")) varValue = varValue.slice(0, -1);
                if (variables[varName] === varValue) running = true;
                cmd = cmd.replace(`(${condition})`, "");
              } else running = true;
              if (running === true) {
                if (cmd.toLowerCase().startsWith("qik.move")) {
                  let args = cmd.split(" ");
                  let target = args[1];
                  let dest = args[2];
                  fsExtra.moveSync(target, dest, { overwrite: true });
                } else if (cmd.toLowerCase().startsWith("qik.remove")) {
                  let args = cmd.split(" ");
                  let target = args[1];
                  fs.rmSync(target, { recursive: true, force: true });
                } else {
                  execSync(cmd, {stdio: 'inherit', stdin: 'inherit', sterr: 'inherit'});
                }
              }
            }
          }
        }
      } else {
        // If Qikfile doesn't exists.
        console.error(getMsg("no_qikfile").red)
        fs.rmSync(`${dirName}`, {recursive: true, force: true});
      }
    } else {
      // If clone directory doesn't exists
      console.error(getMsg("error_when_cloning").red);
    }
  } else {
    // If the git link is not valid.
    console.log(getMsg("link_unvalid").red);
  }
}

module.exports = createCommand("init")
  .description(getMsg("init_description"))
  .argument("[link]", getMsg("link_arg"))
  .option("-b, --branch <branch>", getMsg("branch_arg"))
  .option("-lr, --latest-release", getMsg("lr_arg"))
  .action(init)
