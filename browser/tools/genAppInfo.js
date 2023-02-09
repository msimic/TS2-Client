const fs = require("fs");

const pjson = require('../package.json');


let build = process.argv[2];
const { exec } = require("child_process");

exec(build, (error, stdout, stderr) => {
    const buildhash = stdout.trim().toString();
    if (error) {
        console.log(`Could not fetch build version: ${error.message}`);
        process.exit(1);
    }
    if (stderr) {
        console.log(`Could not fetch build version: ${stderr}`);
        process.exit(1);
    }
    let txt = `export namespace AppInfo {
        export let AppTitle: string = "${pjson.description}";
        export let RepoUrl: string = "${pjson.repository.url}";
        export let BugsUrl: string = "${pjson.bugs.url}";
        export let Version: string = "${pjson.version}";
        export let Build: string = "${buildhash}";
        export let Author: string = "${pjson.author}";
        export let Contributors: string[] = ["${pjson.contributors.join("\",\"")}"];
        
    }`;
    
    fs.writeFileSync('src/ts/appInfo.ts', txt);
});
