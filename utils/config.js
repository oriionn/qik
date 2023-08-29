// os for get homedir (for linux and macos)
const os = require("os");
// path to join path for settings
const path = require("path");
// TOML Parser for settings
const TOML = require('@iarna/toml')
// fs for get settings
const fs = require("fs");

function getParentConfigPath() {
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA, 'qik');
  } else if (os.platform() === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'qik');
  } else if (os.platform() === 'linux') {
    return path.join(os.homedir(), '.config', 'qik'), path.join(os.homedir(), '.config');
  } else {
    return null;
  }
}

function getConfigPath() {
  if (os.platform() === 'win32') {
    return path.join(process.env.APPDATA, 'qik', 'settings.toml');
  } else if (os.platform() === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'qik', 'settings.toml');
  } else if (os.platform() === 'linux') {
    return path.join(os.homedir(), '.config', 'qik', 'settings.toml');
  } else {
    return null;
  }
}

function getUserConfig() {
  let configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    let parentConfigPath = getParentConfigPath();
    fs.mkdirSync(parentConfigPath, { recursive: true });
    fs.writeFileSync(configPath, "");
  }
  return TOML.parse(fs.readFileSync(configPath));
}

module.exports = {
  getConfigPath,
  getParentConfigPath,
  getUserConfig
}