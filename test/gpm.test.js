/**
 * Created by axetroy on 17-2-15.
 */
const path = require('path');
const os = require('os');

require('colors');
const test = require('ava');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const gitUrlParse = require("git-url-parse");

const pkg = require('../package.json');
const CONFIG = require('../lib/config');
const prepare = require('../lib/prepare');
const addCommand = require('../lib/command/add');
const listCommand = require('../lib/command/list');
const runtimeCommand = require('../lib/command/runtime');
const configCommand = require('../lib/command/config');
const cleanCommand = require('../lib/command/clean');

const globalConfig = require('../lib/global-config');

const {home, root, temp, config} = CONFIG.paths;

test.before(async function (t) {
  await fs.emptydirAsync(home);
  await fs.removeAsync(home);
  t.pass();
});

test.serial.beforeEach(async function (t) {
  await fs.ensureDir(home);
  await prepare();
  await globalConfig.init();
  t.pass();
});

test.serial.afterEach(async function (t) {
  await globalConfig.reset();
  await fs.emptydirAsync(home);
  await fs.removeAsync(home);
  t.pass();
});

test.serial('prepare', async(t) => {
  await fs.readdirAsync(home);
  const __root__ = await fs.readdirAsync(root);
  const __temp__ = await fs.readdirAsync(temp);
  const __config__ = await fs.readJsonAsync(config);
  t.deepEqual(__root__.length, 3);
  t.deepEqual(__temp__.length, 0);
  t.deepEqual(__config__, CONFIG.defaults);
  t.pass();
});

test.serial('add & list', async(t) => {
  const url = 'https://github.com/gpmer/gpm-empty-repository-for-test.git';
  const argv = {repo: url}, options = {force: true, nolog: true};
  const gitInfo = gitUrlParse(url);

  const gpmConfig = await fs.readJsonAsync(config);
  const baseDir = path.join(home, gpmConfig.base);
  const sourceDir = path.join(baseDir, gitInfo.source);
  const ownerDir = path.join(sourceDir, gitInfo.owner);
  const repoDir = path.join(ownerDir, typeof options.name === 'string' ? options.name : gitInfo.name);

  await addCommand(argv, options);

  await fs.ensureDirAsync(baseDir);
  await fs.ensureDirAsync(sourceDir);
  await fs.ensureDirAsync(ownerDir);
  await fs.ensureDirAsync(repoDir);

  const result = await listCommand({}, {nolog: true});

  const source = 'github.com'.red;
  const owner = 'gpmer'.yellow;
  const name = 'gpm-empty-repository-for-test'.green;

  t.deepEqual(_.keys(result), [source]);
  t.deepEqual(_.keys(result[source]), [owner]);
  t.deepEqual(_.keys(result[source][owner]), [name]);
  t.deepEqual(result[source][owner][name], repoDir.white);

  t.pass();

});

test('runtime', async(t) => {

  const info = await runtimeCommand({}, {nolog: true});

  t.deepEqual(info.node, process.version);
  t.deepEqual(info[CONFIG.name], pkg.version);
  t.deepEqual(info.arch, os.arch());
  t.deepEqual(info.os, os.type() + ' ' + os.release());
  t.deepEqual(info.platform, os.platform());

  t.pass();
});

test.serial('config list', async(t) => {

  const __CONFIG__ = await configCommand({action: 'list'}, {nolog: true});

  t.deepEqual(__CONFIG__.version, pkg.version);
  t.deepEqual(__CONFIG__.owner, CONFIG.name);
  t.deepEqual(__CONFIG__.base, CONFIG.name);

  t.pass();
});

test.serial('config get', async(t) => {

  const version = await configCommand({action: 'get', key: 'version'}, {nolog: true});
  const owner = await configCommand({action: 'get', key: 'owner'}, {nolog: true});
  const base = await configCommand({action: 'get', key: 'base'}, {nolog: true});

  t.deepEqual(globalConfig.entity.version, version);
  t.deepEqual(globalConfig.entity.owner, owner);
  t.deepEqual(globalConfig.entity.base, base);

  t.pass();
});

test.serial('config set', async(t) => {

  const actions = [
    {action: 'set', key: 'version', value: 'test version'},
    {action: 'set', key: 'owner', value: 'test owner'},
    {action: 'set', key: 'base', value: 'test base'}
  ];

  const __actions__ = actions.slice();

  while (actions.length) {
    const action = actions.shift();
    await configCommand(action, {nolog: true});
  }

  t.deepEqual(globalConfig.entity.version, __actions__[0].value);
  t.deepEqual(globalConfig.entity.owner, __actions__[1].value);
  t.deepEqual(globalConfig.entity.base, __actions__[2].value);

  t.pass();
});

test.serial('config remove', async(t) => {

  const actions = [
    {action: 'remove', key: 'version'},
    {action: 'remove', key: 'owner'},
    {action: 'remove', key: 'base'}
  ];

  while (actions.length) {
    const action = actions.shift();
    await configCommand(action, {nolog: true});
    t.deepEqual(globalConfig.entity[action.key], void 0);
  }

  t.pass();
});

test.serial('config reset', async(t) => {

  const __config__ = await configCommand({action: 'reset'}, {nolog: true});

  const configJSON = await fs.readJsonAsync(config);

  t.deepEqual(__config__, configJSON);
  t.deepEqual(__config__, CONFIG.defaults);

  t.pass();
});