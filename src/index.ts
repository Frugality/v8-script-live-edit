import * as fs from 'fs';
import * as vm from 'vm';
import * as path from 'path';
import * as typescript from 'typescript'

import ModuleWrapper = require('./wrapper');

const Debug = vm.runInDebugContext('Debug');

const EnglishText = {
  FILE_RELOADED: 'Reloading',
  FUNCTION_RELOADED: '[*]',
  FUNCTION_NOT_RELOADED: '[X]',
}

const EmojiText = {
  FILE_RELOADED: '🔄',
  FUNCTION_RELOADED: '✅',
  FUNCTION_NOT_RELOADED: '⛔',
}
const Text = EmojiText;

class ScriptLiveEdit {
  compilerOptions: typescript.CompilerOptions;

  constructor() {
    this.compilerOptions = { 
      fast: true, 
      allowJs: true,
      ignoreWarnings: true, 
      target: typescript.ScriptTarget.ES2017,
      inlineSourceMap: true,
      moduleResolution: typescript.ModuleResolutionKind.NodeJs,
      module: typescript.ModuleKind.CommonJS
    };
  }

  reloadModule(module : NodeModule, filename : string) {
    fs.readFile(filename, 'utf-8', (err, contents) => {
      if (contents.length > 0) {
        let ext = path.extname(filename);

        let tsOptions: typescript.TranspileOptions = {
          fileName: filename,
          compilerOptions: this.compilerOptions,
          reportDiagnostics: true
        };

        let output = typescript.transpileModule(contents, tsOptions);

        contents = ModuleWrapper.wrap(output.outputText);

        this.updateScriptContents(filename, contents);
      }
    });
  }

  updateScriptContents(filename : string, contents : string) {
    const LiveEdit = Debug.LiveEdit;

    let script = Debug.findScript(filename);

    if (script && script.source !== contents) {
      this.willUpdate(filename);

      let changes = [];

      try {
        let change_desc = LiveEdit.SetScriptSource(script, contents, false, changes);

        this.didUpdate(filename, change_desc, changes);
      } catch (e) {
        console.error("LiveEdit exception: " + e);
        // throw e;
      }
    }
  }

  willUpdate(filename : string) {
    let relative = path.relative(process.cwd(), filename);
    console.log(`${Text.FILE_RELOADED} ${relative}`);
  }

  didUpdate(filename : string, change_desc: any, changes : any[]) {
    changes.forEach(change => {
      if (change.function_patched !== undefined) {
        if (change.function_info_not_found) {
          console.log(`\t${Text.FUNCTION_NOT_RELOADED} ${change.function_patched}`);
        }
        else {
          console.log(`\t${Text.FUNCTION_RELOADED} ${change.function_patched}`);
        }
      }
      else if (change.position_patched || change.linked_to_old_script) {
        // do nothing
      }
      else {
        console.log(JSON.stringify(change));
      }
    })
  }
}
async function stat(filename: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    fs.stat(filename, (err, stats) => {
      if (stats) {
        resolve(stats.mtime.getTime());
      } else {
        reject();
      }
    });
  });
}

class ScriptWatcher {
  modified: { [name: string] : number };

  constructor() {
    this.modified = {};
  }

  async watch(module : NodeModule) {
    const filename = module.filename;

    if(this.modified[filename] === undefined) {
      // placeholder while we wait for the stat
      this.modified[filename] = 0.0;
      // get the real mtime
      this.modified[filename] = await stat(filename);

      // console.log(`Watching ${module.id}`);
      fs.watch(filename, {persistent: false}, async (eventType, eventFilename) => {
        // console.log(`Module ${filename} changed. Event=${eventType} ${filename}`);
        let mtime = await stat(filename);

        if(mtime !== this.modified[filename]) {
          this.modified[filename] = mtime;
          this.changed(module, filename);
        }
      })
    }
  }

  watchLoaded() {
    Object.keys(require.cache).forEach(moduleName => {
      this.watch(require.cache[moduleName]);
    })
  }

  watchForNewModules() {
    const Module = ModuleWrapper.Module;
    const baseLoad = Module._load;
    const scriptWatcher = this;

    // console.log(`watching for new modules`);
    Module._load = function(request, parent, isMain) {
      let result = baseLoad.call(this, request, parent, isMain);

      try {
        if(result) {
          let filename = Module._resolveFilename(request, parent, isMain);
          let module = Module._cache[filename];
          if(module) {
            scriptWatcher.watch(module);
          }
        }
      }
      catch(e) {
        console.log(e.message);
      }

      return result;
    }
  }

  changed(module : NodeModule, filename : string) {}
}

class NativeExtension {
  static get isRequired() : boolean {
    const [major, minor, patch] = process.version.substring(1).split('.').map(x => Number(x));
    return (major == 8 && minor > 2);
  }

  static load() : boolean {
    let liveEdit = require('bindings')('live_edit');
    if(liveEdit) {
      liveEdit.setLiveEditEnabled(true);
      return true;
    }

    return false;
  }
}

let native = false;

if(NativeExtension.isRequired) {
  native = NativeExtension.load();
}

if(Debug) {
  const watcher = new ScriptWatcher();
  watcher.watchLoaded();
  watcher.watchForNewModules();

  const reloader = new ScriptLiveEdit();

  watcher.changed = (module : NodeModule, filename : string) => {
    reloader.reloadModule(module, filename);
  }

  let nativeMessage = native ? 'w/ Native Extension' : '';
  console.log(`Script LiveEdit Activated ${nativeMessage}`);
}