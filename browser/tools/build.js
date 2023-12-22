const del = require('del');
const fs = require('fs');
const fsx = require('fs-extra');
const path = require('path');
const minify = require('@node-minify/core');
const noCompress = require('@node-minify/no-compress');
const cleanCSS = require('@node-minify/clean-css');
const terser = require('@node-minify/terser');
const htmlMinifier = require('@node-minify/html-minifier');

function minifyHtml(next) {
    console.log("Minifying HTML")
    minify({
        compressor: htmlMinifier,
        input: './buildfiles/index-prod.html',
        output: './dist/index.html',
        options: {
            'minifyURLs': true,
            'collapseWhitespace': true,
            'collapseInlineTagWhitespace': false,
            'caseSensitive': false,
            'minifyJS': true,
            'minifyCSS': true,
            'sortAttributes': true,
            'sortClassName': true,
        },
        callback: function(err, min) {if (!err && next) next();}
      });
}

function minifyTern(next) {
    console.log("Minifying TERN")
    minify({
        compressor: terser,
        input: ['./dist/tern_module.js'],
        output: './dist/tern_module.min.js',
        callback: function(err, min) { if (!err && next) next();}
      });
}

function minifyCodemirror(next) {
    console.log("Minifying Codemirror")
    minify({
        compressor: terser,
        input: ['./dist/codemirror_module.js'],
        output: './dist/codemirror_module.min.js',
        callback: function(err, min) { if (!err && next) next();}
      });
}

function minifyJqWidgets(next) {
    console.log("Minifying jqWidgets")
    minify({
        compressor: terser,
        input: ['./dist/jqwidgets_module.js'],
        output: './dist/jqwidgets_module.min.js',
        callback: function(err, min) { if (!err && next) next();}
      });
}

function minifyCss(next) {
    console.log("Minifying CSS")
    minify({
        compressor: cleanCSS,
        input: [
            './static/public/codemirror/lib/codemirror.css',
            './static/public/codemirror/theme/neat.css',
            './static/public/codemirror/theme/material.css',
            './static/public/codemirror/addon/hint/show-hint.css',
            './static/public/codemirror/addon/dialog/dialog.css',
            './static/public/codemirror/addon/tern/tern.css',
            './static/public/codemirror/addon/scroll/simplescrollbars.css',
            './static/public/codemirror/addon/search/matchesonscrollbar.css',
            './static/public/jqwidgets/styles/jqx.base.css',
            './static/public/jqwidgets/styles/jqx.metro.css',
            './static/public/jqwidgets/styles/jqx.metrodark.css'],
        output: './dist/modules.min.css',
        callback: function(err, min) {
            if (!err) {
                fs.copyFileSync('./dist/modules.min.css', './static/public/modules/modules.min.css');
                if (next) next();
            }
        }
      });
}

function mergeTern(next) {
    console.log("Merging Tern")
    minify({
    compressor: noCompress,
    input: ['./tern/acorn.js','./tern/acorn-loose.js','./tern/walk.js','./tern/signal.js','./tern/tern.js','./tern/def.js','./tern/comment.js','./tern/infer.js','./tern/doc_comment.js'],
    output: './dist/tern_module.js',
    callback: function(err, min) { if (!err && next) next(); }
    });
}

function mergeJqwidgets(next) {
    console.log("Merging jqWidgets")
    minify({
    compressor: noCompress,
    input: [
        './static/public/jqwidgets/jqxcore.js',
        './static/public/jqwidgets/jqxcheckbox.js',
        './static/public/jqwidgets/jqxtree.js',
        './static/public/jqwidgets/jqxdata.js',
        './static/public/jqwidgets/jqxmenu.js',
        './static/public/jqwidgets/jqxwindow.js',
        './static/public/jqwidgets/jqxscrollbar.js',
        './static/public/jqwidgets/jqxbuttons.js',
        './static/public/jqwidgets/jqxlistbox.js',
        './static/public/jqwidgets/jqxdropdownlist.js',
        './static/public/jqwidgets/jqxnotification.js',
        './static/public/jqwidgets/jqxsplitter.js'],
    output: './dist/jqwidgets_module.js',
    callback: function(err, min) { 
        if (!err) {
            if (next) next();
        }
     }
    });
}

function mergeCodemirror(next) {
    console.log("Merging Codemirror")
    minify({
    compressor: noCompress,
    input: [
        './static/public/codemirror/lib/codemirror.js',
        './static/public/codemirror/addon/display/autorefresh.js',
        './static/public/codemirror/mode/javascript/javascript.js',
        './static/public/codemirror/addon/hint/show-hint.js',
        './static/public/codemirror/addon/hint/javascript-hint.js',
        './static/public/codemirror/addon/dialog/dialog.js',
        './static/public/codemirror/addon/scroll/simplescrollbars.js',
        './static/public/codemirror/addon/scroll/annotatescrollbar.js',
        './static/public/codemirror/addon/search/search.js',
        './static/public/codemirror/addon/search/jump-to-line.js',
        './static/public/codemirror/addon/search/matchesonscrollbar.js',
        './static/public/codemirror/addon/search/match-highlighter.js',
        './static/public/codemirror/addon/search/searchcursor.js',
        './static/public/codemirror/addon/tern/tern.js'],
    output: './dist/codemirror_module.js',
    callback: function(err, min) { if (!err && next) next(); }
    });
}

function mergeCoreJs(next) {
    console.log("Merging CoreJS")
    minify({
    compressor: noCompress,
    input: [
        './static/public/modules/corejs.min.js'
    ],
    output: './dist/corejs.min.js',
    callback: function(err, min) { if (!err && next) next(); }
    });
}

function mergeJQuery(next) {
    console.log("Merging JQuery")
    minify({
    compressor: noCompress,
    input: [
        './static/public/modules/jquery.min.js'
    ],
    output: './dist/jquery.min.js',
    callback: function(err, min) { if (!err && next) next(); }
    });
}

function buildAndMinify(callback) {
    mergeJQuery(() => 
    mergeCoreJs(() =>
    mergeTern(() =>
    mergeCodemirror(() =>
    mergeJqwidgets(() =>
    minifyCss(() =>
    minifyTern(() =>
    minifyCodemirror(() =>
    minifyJqWidgets(callback)))))))));
}

function copyToPublic() {
    fs.mkdirSync("dist/public/modules/images", { recursive: true });
    fs.mkdirSync("dist/public/css", { recursive: true });
    let distFiles = [
        './dist/codemirror_module.min.js',
        './dist/corejs.min.js',
        './dist/jquery.min.js',
        './dist/jqwidgets_module.min.js',
        './dist/modules.min.css',
        './dist/tern_module.min.js',
        './src/ecmascript.json'
    ];

    for (const file of distFiles) {
        console.log(`copying file ${file}`);
        fs.copyFileSync(file, './dist/public/modules/' + path.basename(file));
    }

    let imageFiles = [
        'static/public/jqwidgets/styles/images/close.png',
        'static/public/jqwidgets/styles/images/icon-up.png',
        'static/public/jqwidgets/styles/images/icon-down.png',
        'static/public/jqwidgets/styles/images/icon-right.png',
        'static/public/jqwidgets/styles/images/icon-left.png',
    ];

    for (const file of imageFiles) {
        console.log(`copying file ${file}`);
        fs.copyFileSync(file, 'dist/public/modules/images/' + path.basename(file));
    }

    fs.copyFileSync('static/public/index.html', 'dist/public/index.html');
    console.log(`copying file index.html`);

    fs.copyFileSync('static/public/LICENSE.txt', 'dist/public/LICENSE.txt');
    console.log(`copying file LICENSE.txt`);

    fs.copyFileSync('src/cacheServiceWorker.js', 'dist/public/cacheServiceWorker.js');
    console.log(`copying file cacheServiceWorker.js`);

    fs.copyFileSync('src/cacheServiceWorker.js', 'static/public/cacheServiceWorker.js');
    console.log(`copying file cacheServiceWorker.js`);

    const folders = [
        {
        path: './static/public/css',
        regex: /^.*\..*$/i,
        outputFolder: './dist/public/css'
        },
        {
            path: './static/public',
            regex: /^.*favicon\.png$/i,
            outputFolder: './dist/public'
        },
        {
            path: './static/public/jqwidgets/styles/images',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/css/images'
        },
        {
            path: './static/public/css/images',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/css/images'
        },
        {
            path: './static/public/images',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/images'
        },
        {
            path: './static/public/modules/images',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/modules/images'
        },
        {
            path: './static/public/sounds',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/sounds'
        },
        {
            path: './static/public/images/roomtype',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/images/roomtype'
        },
        {
            path: './static/public/images/menu',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/images/menu'
        },
        {
        path: './static/public',
        regex: /^mudslinger.*\.js$/i,
        outputFolder: './dist/public'
        },
        {
            path: './static/public',
            regex: /^.*\.json$|^.*\.webmanifest|^.*\.png$/i,
            outputFolder: './dist/public'
        },
        {
            path: './static/public',
            regex: /^versions\.txt$/i,
            outputFolder: './dist/public'
        },
        {
            path: './static/public/help',
            regex: /^.*\..*$/i,
            outputFolder: './dist/public/help'
        },
    ];

    folders.forEach(folder => {
        fsx.readdirSync(folder.path).forEach(file => {
        if (folder.regex.test(file)) {
            console.log(`copying file ${file}`);
            fsx.copy(`${folder.path}/${file}`, `${folder.outputFolder}/${file}`, {overwrite: true, recursive: true})/*
            .then(() => console.log('success!'))
            .catch(err => console.error(err));*/
        }
        });
    });
}

fsx.copy('./src/ecmascript.json', './static/public/modules/ecmascript.json');

if (!fs.existsSync("./dist")) {
    fs.mkdirSync("dist")
}

buildAndMinify(
(async () => {
    console.log(`Merge and Minify completed`);
    try {

        await del("dist/public");
        
        console.log(`dist/public is deleted!`);
        copyToPublic();
        console.log(`Build done in: dist/public!`);
    } catch (err) {
        console.error(`Error during build: ` + err);
    }
}));