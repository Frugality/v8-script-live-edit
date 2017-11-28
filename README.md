# V8-Script-Live-Edit 

This module will allow your node.js processes to automatically reload their files, as they change on disk. All you need to do is require() this module, and it'll do the rest. The heavy lifting (code diffing/updating) is done by v8's LiveEdit module. This module just watches your files on disk, and when they change, it reloads them, and then writes to the console what was changed.

This doesn't interfere with your existing debugger -- you can freely use VS Code or whatever you prefer to debug your code. VS Code appears to behave well when the code changes on the fly.

## Usage

Require the module. I prefer to do this on the command-line, so it doesn't accidentally spill over into production code

```
node -r v8-script-live-edit
```

## Example Output

Once you make a change, you'll see the reloader.

```
🔄 build/server/GameWebView.js
	✅ 
	✅ trackConnections
	✅ run
	✅ shutdown
	✅ addRoutes
```


## Known Issues

Doesn't work with NodeJS 9+. The vm.runInDebugContext() has been removed, and multi-client debugging, which was just recently added to V8/Chrome, has not yet made it into Node.