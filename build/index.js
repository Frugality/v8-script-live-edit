"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ModuleWrapper = require("./wrapper");
const typescript = require("typescript");
const Debug = vm.runInDebugContext('Debug');
const EnglishText = {
    FILE_RELOADED: 'Reloading',
    FUNCTION_RELOADED: '[*]',
    FUNCTION_NOT_RELOADED: '[X]',
};
const EmojiText = {
    FILE_RELOADED: '🔄',
    FUNCTION_RELOADED: '✅',
    FUNCTION_NOT_RELOADED: '⛔',
};
const Text = EmojiText;
class ScriptLiveEdit {
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
    reloadModule(module, filename) {
        fs.readFile(filename, 'utf-8', (err, contents) => {
            if (contents.length > 0) {
                let ext = path.extname(filename);
                let tsOptions = {
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
    updateScriptContents(filename, contents) {
        const LiveEdit = Debug.LiveEdit;
        let script = Debug.findScript(filename);
        if (script && script.source !== contents) {
            this.willUpdate(filename);
            let changes = [];
            try {
                let change_desc = LiveEdit.SetScriptSource(script, contents, false, changes);
                this.didUpdate(filename, change_desc, changes);
            }
            catch (e) {
                console.error("LiveEdit exception: " + e);
                throw e;
            }
        }
    }
    willUpdate(filename) {
        let relative = path.relative(process.cwd(), filename);
        console.log(`${Text.FILE_RELOADED} ${relative}`);
    }
    didUpdate(filename, change_desc, changes) {
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
        });
    }
}
class ScriptWatcher {
    constructor() {
        this.watching = {};
    }
    watch(module) {
        const filename = module.filename;
        if (this.watching[filename] === undefined) {
            this.watching[filename] = 1;
            // console.log(`Watching ${module.id}`);
            fs.watch(filename, { persistent: false }, (eventType, eventFilename) => {
                // console.log(`Module ${filename} changed. Event=${eventType} ${filename}`);
                this.changed(module, filename);
            });
        }
    }
    watchLoaded() {
        Object.keys(require.cache).forEach(moduleName => {
            this.watch(require.cache[moduleName]);
        });
    }
    watchForNewModules() {
        const Module = ModuleWrapper.Module;
        const baseLoad = Module._load;
        const scriptWatcher = this;
        // console.log(`watching for new modules`);
        Module._load = function (request, parent, isMain) {
            let result = baseLoad.call(this, request, parent, isMain);
            try {
                if (result) {
                    let filename = Module._resolveFilename(request, parent, isMain);
                    let module = Module._cache[filename];
                    if (module) {
                        scriptWatcher.watch(module);
                    }
                }
            }
            catch (e) {
                console.log(e.message);
            }
            return result;
        };
    }
    changed(module, filename) { }
}
if (Debug) {
    const watcher = new ScriptWatcher();
    watcher.watchLoaded();
    watcher.watchForNewModules();
    const reloader = new ScriptLiveEdit();
    watcher.changed = (module, filename) => {
        reloader.reloadModule(module, filename);
    };
    console.log("Script Live Edit Activated");
}
//# sourceMappingURL=index.js.map