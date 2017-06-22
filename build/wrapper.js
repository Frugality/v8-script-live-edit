const nodeModule = require('module');
/*
  const header = escapeRegExp(nodeModule.wrapper[0]);
  const footer = escapeRegExp(nodeModule.wrapper[1]);
  const moduleRegex = new RegExp(`^${header}(.*)${footer}\$`);
 */
function escapeRegex(str) {
    return str.replace(/([/\\.?*()^${}|[\]])/g, '\\$1');
}
const MODULE_HEADER = '(function (exports, require, module, __filename, __dirname) { ';
const MODULE_TRAILER = '\n});';
const MODULE_WRAP_REGEX = new RegExp('^' + escapeRegex(MODULE_HEADER) +
    '([\\s\\S]*)' +
    escapeRegex(MODULE_TRAILER) + '$');
class ModuleWrapper {
    static get wrapper() {
        return nodeModule.wrapper;
    }
    static get header() {
        return this.wrapper[0];
    }
    static get footer() {
        return this.wrapper[1];
    }
    /**
     * @param {string} contents
     * @return {string}
     */
    static unwrap(contents) {
        let match = MODULE_WRAP_REGEX.exec(contents);
        if (match) {
            console.log('matched');
            return match[1];
        }
        else {
            console.log('no matched');
            return contents;
        }
    }
    /**
     * @param {string} contents
     * @return {string}
     */
    static wrap(contents) {
        return nodeModule.wrap(contents);
    }
    static get Module() {
        return nodeModule.Module;
    }
}
module.exports = ModuleWrapper;
//# sourceMappingURL=wrapper.js.map