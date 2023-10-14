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

    generateVersions();
});

function generateVersions() {
    const ver = pjson.version

    let versions = fs.readFileSync("./static/public/versions.txt").toString()
    let latest = fs.readFileSync("./latestVersion.txt").toString()
    const currentVersionStart = versions.indexOf(ver)
    console.log(ver + " " + currentVersionStart)

    if (currentVersionStart==-1 || currentVersionStart!=0) {
        versions = addLatestVersion(latest, versions)
        fs.writeFileSync("./static/public/versions.txt", versions)
    } else {
        let lines = versions.split(/\r\n|\r|\n/g)
        const index = lines.findIndex((v)=>{
            const m = v.match(/^\d+\.\d+\.\d+$/gi)
            const ok = v != ver && m
            return ok
        })
        console.log(index)
        if (index > 0 && index<lines.length) {
            lines.splice(0, index)
            versions = lines.join("\n")
            versions = addLatestVersion(latest, versions)
            fs.writeFileSync("./static/public/versions.txt", versions)
        }
    }

    function addLatestVersion(latest, versions) {
        return `${ver}
${latest}
____________________________________________________________
${versions}`;
    }
}
