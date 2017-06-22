const fs = require('fs');
const vm = require('vm');
const nodeModule = require('module');
const Debug = vm.runInDebugContext('Debug');
let tsNode;


if(Debug) {
  const LiveEdit = Debug.LiveEdit;
  const baseMethod = LiveEdit.SetScriptSource;

  try {
    tsNode = require('ts-node');
  }
  catch(e) {
    console.error(e);
  }

  function escapeRegex(str) {
    return str.replace(/([/\\.?*()^${}|[\]])/g, '\\$1');
  }

  // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
  function escapeRegExp(string){
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  var MODULE_HEADER = '(function (exports, require, module, __filename, __dirname) { ';
  var MODULE_TRAILER = '\n});';
  var MODULE_WRAP_REGEX = new RegExp(
    '^' + escapeRegex(MODULE_HEADER) +
      '([\\s\\S]*)' +
      escapeRegex(MODULE_TRAILER) + '$'
  );

  const header = escapeRegExp(nodeModule.wrapper[0]);
  const footer = escapeRegExp(nodeModule.wrapper[1]);
  const moduleRegex = new RegExp(`^${header}(.*)${footer}\$`);

  function unwrapModule(contents) {
    let match = MODULE_WRAP_REGEX.exec(contents);
    if(match) {
      console.log('matched');
      return match[1];
    }
    else {
      console.log('no matched');
      return contents;
    }
  }

  function reloadScript(filename, contents) {
    let script = Debug.findScript(filename);
    if(script) {
      if(script.source !== contents) {
        console.log(`Reloading ${filename}`);

        let changes = [];
        try {
          let result = LiveEdit.SetScriptSource(script, contents, false, changes);

          changes.forEach(change => {
            if(change.function_patched !== undefined) {
              if(change.function_info_not_found) {
                console.log(`\t⛔ ${change.function_patched}`);
              }
              else {
                console.log(`\t✅ ${change.function_patched}`);
              }
            }
            else if(change.position_patched || change.linked_to_old_script) {
              // do nothing
            }
            else {
              console.log(JSON.stringify(change));
            }
          })
        } catch (e) {
          console.error("LiveEdit exception: " + e);
          throw e;
        }
      }
    }
    else {
      // console.log(`Unable to find ${filename}`);
    }
  }

  let register = tsNode ? tsNode.register({fast: true, allowJs: true, ignoreWarnings: true, target: 'es2017'}) : null;

  function reloadModule(module, filename) {
    let contents = fs.readFileSync(filename, 'utf-8');

    if(register) {
      contents = register.compile(contents, filename);
    }
    contents = nodeModule.wrap(contents);

    reloadScript(filename, contents);
  }

  const watching = {};

  function watchModule(module) {
    const filename = module.filename;

    if(watching[filename] === undefined) {
      watching[filename] = 1;

      // console.log(`Watching ${module.id}`);
      fs.watch(filename, {persistent: false}, (eventType, eventFilename) => {
        // console.log(`Module ${filename} changed. Event=${eventType} ${filename}`);
        reloadModule(module, filename);
      })
    }
  }

  function watchLoadedModules() {
    Object.keys(require.cache).forEach(moduleName => {
      watchModule(require.cache[moduleName]);
    })
  }

  function watchForNewModules() {
    const Module = nodeModule.Module;
    const baseLoad = Module._load;

    // console.log(`watching for new modules`);

    Module._load = function(request, parent, isMain) {
      let result = baseLoad.call(this, request, parent, isMain);

      try {
        if(result) {
          let filename = Module._resolveFilename(request, parent, isMain);
          let module = Module._cache[filename];
          if(module) {
            watchModule(module);
          }
        }
      }
      catch(e) {
        console.log(e.message);
      }

      return result;
    };
  }

  watchLoadedModules();
  watchForNewModules();

  console.log("Script Live Edit Activated");
}
