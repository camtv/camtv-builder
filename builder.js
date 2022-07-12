#!/bin/node

const ParcelJs = require('parcel-bundler');
const Path = require('path');
const Commander = require('commander');
const rimraf = require("rimraf");
const LiquidJS = require('liquidjs');
const fs = require('fs')
const express = require('express');
const Url = require("url");
const urljoin = require('url-join');
const HTMLAsset = require('parcel-bundler/lib/assets/HTMLAsset');
const axios = require('axios');
const https = require('https');
const postHTML = require("posthtml");
const posthtmlInlineAssets = require("posthtml-inline-assets");
const cssPurge = require('css-purge');
const recursive = require("recursive-readdir");
const fse = require("fs-extra");
const replaceall = require("replaceall");
const cookieParser = require('cookie-parser');
const TranslationsFile = require('./translations_file.js');

class HTMLPrecompiler extends HTMLAsset {

    constructor(name, options) {
        super(name, options);
    }

    async pretransform() {
        return super.pretransform();
    }

    generate() {
        return super.generate();
    }

    async postProcess(generated) {
        return super.postProcess(generated);
    }

    async transform() {
        return super.transform();
    }

    processSingleDependency(path, opts) {

        if (path.startsWith("{{"))
            return path;
        return super.processSingleDependency(path, opts)
    }

    collectDependencies() {
        return super.collectDependencies()
    }
}

function ParseCommandLine() {
    let cmdLine = new Commander.Command();

    cmdLine.version('1.0.0', '-v, --version')
    cmdLine.command('release [FILES...]')
    cmdLine.command('dev [FILES...]')
    cmdLine.command('serve ')
    cmdLine.usage('[OPTIONS]...')
    cmdLine.option('-c, --template-data <template_data>', 'Template data in format of .js (must have module.exports)', './template_data.js')
    cmdLine.option('-o, --out-dir <out_dir>', 'Output directory', './dist')
    cmdLine.option('-u, --public-url <public_url>', 'Public url, or relative path', '/')
    cmdLine.option('-p, --port <http_port>', 'HTTP port where to listen when in dev mode', 1234)
    cmdLine.option('-r, --hmr-port <http_port>', 'WS port where to listen when in dev mode for autoreload', 12345)
    cmdLine.option('-nh, --use-hmr <use_hmr>', 'set hrm used by parcel to false', true)
    cmdLine.option('-n, --hmr-hostname <hmr_hostname>', 'Hostname when in dev mode for autoreload', '')
    cmdLine.option('-ic, --inline-css <css_inline_mode>', 'inline cssmode, purge to purge, no-purge to avoid purging', '')
    cmdLine.option('-td, --translations-url <translations_url>', 'Url that get/set the translation file')
    cmdLine.option('-tk, --translations-key <translations_key>', 'the key used by the sistem to pair the string in the code with the translated string', 'key')
    cmdLine.option('-trk, --translations-remove-key <translations_remove_key>', 'a boolean value used to indicate if the key need to be removed from the lang list', true)
    cmdLine.option('-dl, --default-language <default_language>', 'default language that is used for all languages that has no translation', 'en')

    cmdLine.parse(process.argv);

    cmdLine.isRelease = false;
    if (cmdLine.args.length > 0 && cmdLine.args[0] == 'release') {
        cmdLine.isRelease = true;
    }
    else if (cmdLine.args.length > 0 && cmdLine.args[0] == 'serve') {
        cmdLine.isServing = true;
        if (cmdLine.outDir.startsWith('/') == false){
            
            cmdLine.outDir = Path.join(__dirname, cmdLine.outDir);
        }

        cmdLine.entryFiles = []
        let vFiles = fs.readdirSync(cmdLine.outDir)
        vFiles.forEach((f) => {
            if (f.endsWith(".html"))
                cmdLine.entryFiles.push(f);
        })
        return cmdLine;
    }

    cmdLine.args = cmdLine.args.slice(1);
    cmdLine.entryFiles = []
    for (let i = 0; i < cmdLine.args.length; i++) {
        cmdLine.entryFiles.push(Path.join(process.cwd(), cmdLine.args[i]))
    }
    return cmdLine
}

class Translations {

    constructor() {
        this.TranslationData = {
            "Langs": ["en"],
            "KeyLang": "en",
            "Translations": []
        }
    }

    get HasTranslations() {
        return this.TranslationData.Translations.length > 0
    }

    async LoadTranslations(url, key, removeKey) {
        this.TranslationsFile = new TranslationsFile(url, key, removeKey);
        this.TranslationData = await this.TranslationsFile.Get();

        /*
        if (fs.existsSync("./translations.js")) {
            this.TranslationData = require("./translations.js");
        }
        */
    }

    async Process(TranslateCacheDir, OutDir, publicUrl, defaultLanguage) {

        if (OutDir.startsWith("./"))
            OutDir = Path.join(process.cwd(), OutDir)
        
        rimraf.sync(OutDir)
        if (!fs.existsSync(OutDir))
            fs.mkdirSync(OutDir);


        this.TranslationData.Langs.forEach(async (ln) => {

            try {

                let source = TranslateCacheDir

                var destination = Path.join(OutDir, "localized-files");
                
                //rimraf.sync(destination)
                if (!fs.existsSync(destination))
                    fs.mkdirSync(destination);

                destination = Path.join(destination, ln);

                rimraf.sync(destination)
                if (!fs.existsSync(destination))
                    fs.mkdirSync(destination);

                fse.copySync(source, destination)

                let files = await recursive(destination, [(file) => { return (file.endsWith(".js") == false && file.endsWith(".html") == false && file.endsWith(".css") == false) }])
                files.forEach((file) => {
                    this.ProcessFile(ln, file, file, publicUrl)
                })
                this.TranslationsFile.UpdateMissingKeys();
                this.TranslationsFile.UpdateUsedKeys();

                if(ln == defaultLanguage){
                    fse.copySync(destination, OutDir)

                }

            }
            catch (ex) {
                console.log(ex)
            }
        })

        
    }

    ProcessFile(lang, fileNameInput, fileNameOutput, publicUrl) {
        if (publicUrl.startsWith("."))
            publicUrl = publicUrl.substring(1)
        if (publicUrl.startsWith("/"))
            publicUrl = publicUrl.substring(1)

        let publicUrlWithLang = publicUrl;
        if (publicUrlWithLang.endsWith("/") == false)
            publicUrlWithLang = publicUrlWithLang + "/"
        publicUrlWithLang = publicUrlWithLang + lang + "/"

        let text = fs.readFileSync(fileNameInput, 'utf8')
        text = this.TranslateText(text, lang, fileNameInput)
        
        if(publicUrl != '')
            text = replaceall(publicUrl, publicUrlWithLang, text)
        fs.writeFileSync(fileNameOutput, text)
    }

    TranslateText(text, lang, fileName) {
        text = text.replace(/{%Ln%}/g, lang);

        // Controllo che la lingua selezionata sia disponibile
        if (!this.TranslationData.Langs || this.TranslationData.Langs.indexOf(lang) == -1) {
            Logger.Error("Translations - Missing lang: " + lang);
        }

        // Traduco e sostituisco le variabili
        const translatedText = text.replace(/{%T\|([\s\S]*?)\|%}/g, (match, inner) => {
            const textVariables = inner.split("|%|");
            const hasVariables = textVariables.length > 1;
            const variables = hasVariables ? textVariables[1].split(",") : [];
            const text = textVariables[0];

            let translation = text;
            translation = this._Ts(translation, lang);
            translation = this._ReplaceVariables(translation, variables);

            // L'apice lo converto in apostrofo, le virgolette le preservo perchè possono esserci degli elementi html del tipo class="{0}" nelle traduzioni e non voglio tradure i tags
            translation = translation.replace(/(?<!\\)('|")/g, (m, apex) => (apex == "'" ? "’" : '"'));

            return translation;
        });

        // Controllo se mancano i brackets
        const indexError = translatedText.indexOf("{%T|");
        if (indexError > 0) {
            const spotText = translatedText.substring(indexError, indexError + 128) + "...";
            throw `Translations - Misplaced |%} in file: ${fileName || "?"}. Check string before: ${spotText}`;
        }

        return translatedText;
    }

    _Ts(Str, Ln) {
        
        if (!this.TranslationData.Translations || Object.keys(this.TranslationData.Translations).length == 0)
            return Str;

        for (let i = 0; i < this.TranslationData.Translations.length; i++) {
            if (this.TranslationData.Translations[i][this.TranslationData.KeyLang] == Str) {
                if (this.TranslationData.Translations[i][Ln] != null){
                    this.TranslationsFile.SetUsed(this.TranslationData.Translations[i][this.TranslationData.KeyLang]);
                    return this.TranslationData.Translations[i][Ln];
                }
            }
        }
        this.TranslationsFile.SetMissing(Str);

        return Str;
    }

    _ReplaceVariables(text, variables) {
        if (!variables || variables.length == 0) return text;

        variables.forEach((variable, i) => {
            const tag = "{" + i + "}";

            let value = variable;
            if (variable.startsWith('"') || variable.startsWith("'"))
                value = eval(variable);
            else if (variable.startsWith("[") && variable.endsWith("]"))
                value = `{%|${variable}|%}`;
            else
                value = variable;
            if (text.indexOf(tag) == -1)
                Logger.Warning("Missing parameter inside text: " + text);
            text = text.replace(tag, value);
        });

        return text;
    }

}

(async function () {
    let cmdLine = ParseCommandLine();
    let entryFiles = cmdLine.entryFiles;

    let IsProduction = cmdLine.isRelease;

    let translator = new Translations();
    let OutDir = cmdLine.outDir;

    await translator.LoadTranslations(cmdLine.translationsUrl, cmdLine.translationsKey, cmdLine.translationsRemoveKey);
    if (translator.HasTranslations == true) {
        OutDir = Path.join(__dirname, "translation_cache")
    }

    let option = {
        production: IsProduction,
        outDir: OutDir,
        publicUrl: cmdLine.publicUrl,
        watch: IsProduction == false, // Whether to watch the files and rebuild them on change, defaults to process.env.NODE_ENV !== 'production'
        cache: IsProduction == false, // Enabled or disables caching, defaults to true
        cacheDir: ".cache", // The directory cache gets put in, defaults to .cache
        contentHash: false, // Disable content hash from being included on the filename
        global: 'moduleName', // Expose modules as UMD under this name, disabled by default
        minify: IsProduction == true, // Minify files, enabled if process.env.NODE_ENV === 'production'
        scopeHoist: false, // Turn on experimental scope hoisting/tree shaking flag, for smaller production bundles
        target: 'browser', // Browser/node/electron, defaults to browser
        // https: { // Define a custom {key, cert} pair, use true to generate one or false to use http
        // 	cert: './ssl/c.crt', // Path to custom certificate
        // 	key: './ssl/k.key' // Path to custom key
        // },
        logLevel: 3, // 5 = save everything to a file, 4 = like 3, but with timestamps and additionally log http requests to dev server, 3 = log info, warnings & errors, 2 = log warnings & errors, 1 = log errors, 0 = log nothing
        hmr: IsProduction == false, // Enable or disable HMR while watching
        hmrPort: cmdLine.hmrPort, // The port the HMR socket runs on, defaults to a random free port (0 in node.js resolves to a random free port)
        sourceMaps: IsProduction == false, // Enable or disable sourcemaps, defaults to enabled (minified builds currently always create sourcemaps)
        hmrHostname: cmdLine.hmrHostname, // A hostname for hot module reload, default to ''
        detailedReport: IsProduction == true, // Prints a detailed report of the bundles, assets, filesizes and times, defaults to false, reports are only printed if watch is disabled
        autoInstall: true, // Enable or disable auto install of missing dependencies found during bundling
    };



    // Initializes a bundler using the entrypoint location and options provided
    const parcel = new ParcelJs(entryFiles, option);
    //parcel.parser.registerExtension('html', HTMLPrecompiler); //Path.join(__dirname, './debug_builder_plugin'));

    if (parcel.options.publicURL == null || parcel.options.publicURL == "")
        parcel.options.publicURL = "/";

    if (IsProduction == false){
        if(cmdLine.useHmr == 'false'){
            parcel.options.hmr = false;
            parcel.options.hmrPort = null;
            parcel.options.hmrHostname = null;
        }
    }

    if (IsProduction == true) {

        if (cmdLine.inlineCss != "") {
            parcel.on("bundled", (bundle) => {
                const bundles = Array.from(bundle.childBundles).concat([bundle]);
                return Promise.all(bundles.map(async bundle => {
                    if (!bundle.entryAsset || bundle.entryAsset.type !== "html") return;

                    const cwd = bundle.entryAsset.options.outDir;
                    const data = fs.readFileSync(bundle.name);
                    const result = await postHTML([posthtmlInlineAssets({
                        // root: parcel.options.publicURL, 					 
                        transforms: {

                            style: {
                                resolve(node) {
                                    if (node.tag === 'link' && node.attrs.rel === 'stylesheet') {

                                        if (node.attrs && node.attrs.href)
                                            return Path.join(cwd, node.attrs.href.replace(parcel.options.publicURL, ""));
                                    }

                                    return false;
                                },
                                transform(node, data) {
                                    let fnSetNode = function (n, d) {
                                        delete n.attrs.href;
                                        delete n.attrs.rel;

                                        n.tag = 'style';
                                        n.content = [d];
                                    }
                                    let InCssString = data.buffer.toString('utf8');
                                    if (cmdLine.inlineCss == "purge") {
                                        cssPurge.purgeCSS(InCssString, {}, (err, res) => {
                                            if (err)
                                                console.log("Error while purgin css")
                                            else
                                                fnSetNode(node, res)
                                        })
                                    }
                                    else
                                        fnSetNode(node, InCssString)
                                        
                                }
                            }
                        },
                    })]).process(data);
                    
                    fs.writeFileSync(bundle.name, result.html);
                }));
            });
        }
        await parcel.bundle();

        if (translator.HasTranslations == true){
            await translator.Process(OutDir, cmdLine.outDir, cmdLine.publicUrl, cmdLine.defaultLanguage);
        }
        // Sostituisce i file css portandoli inline
        //<link rel="stylesheet" href="/revisione_canale_esterno/candidate/blog_wall.10f38aa3.css">
        return;
    }

    let TemplateDataFilePath = cmdLine.templateData;
    
    if (TemplateDataFilePath.startsWith("/") == false)
        TemplateDataFilePath = Path.join(__dirname, cmdLine.templateData);
    
    //TemplateDataFilePath = Path.join(process.cwd(), cmdLine.templateData);
    let TemplateData = null;
    if (fs.existsSync(TemplateDataFilePath)) {
        try {
            TemplateData = require(TemplateDataFilePath)
        }
        catch (Ex) {
            console.log("Error while loading template data file: " + Ex);
        }
    }

    if (TemplateData != null) {
        fs.watchFile(TemplateDataFilePath, (curr, prev) => {
            try {
                delete require.cache[TemplateDataFilePath];
                TemplateData = require(TemplateDataFilePath)
            }
            catch (Ex) {
                console.log("Error while loading template data file: " + Ex);
            }
            rimraf.sync(parcel.options.cacheDir)
            parcel.hmr.emitUpdate([], true)
        });
    }

    if (cmdLine.isServing != true){
        await parcel.serve(parseInt(1233));
    }

    let entries = ['/', '/index.html'];
    entryFiles.forEach((el) => {
        if (entries.indexOf(el) < 0)
            entries.push(el.replace(__dirname, ""))
    })

    for (let i = 0; i < entries.length; i++) {
        entries[i] = urljoin(parcel.options.publicURL, entries[i]);
    }



    let app = express();
    app.use(cookieParser())
    app.get(entries, async (req, res) => {
        let file = "";
        let parsedurl = Url.parse(req.url, true);
        let req_url = parsedurl.pathname;
        let req_query_data = parsedurl.query ? parsedurl.query["data"] : null;
        console.log(req_query_data)
        if (entryFiles.length > 1) {
            if ((req_url == parcel.options.publicURL || req_url + "/" == parcel.options.publicURL || req_url == parcel.options.publicURL + "/" || req_url == parcel.options.publicURL + "/index.html") && entryFiles.indexOf("index.html") < 0) {
                let content = ""
                entryFiles.forEach((el) => {
                    let sUrl = urljoin(parcel.options.publicURL, el.replace(__dirname, ""));
                    content += `<li><a href="${sUrl}">${el.replace(__dirname, "")}</a></li>`
                })
                content = `
						<style>body { padding: 10px; font-family:sans-serif; } h1 {text-align: center;} .centered{ max-width: 700px; margin:auto; line-height: 2;}</style>
						<h1 class="centered">Builded Pages</h1>
						<ul class="centered">${content}</ul>
					`;
                return res.send(content);
            }
            else {
                file = req_url;
                if (file.indexOf(parcel.options.publicURL) == 0)
                    file = file.replace(parcel.options.publicURL, "");
            }
        }
        else
            file = entryFiles[0].replace(__dirname, "")

        let pathfile = file.split('/')
        file = pathfile[pathfile.length - 1];
        let data = fs.readFileSync(Path.join(parcel.options.outDir, file), 'utf-8')
        let DataOut = ""
        try {
            let RenderData = TemplateData;
            let liquidOptions = { strictVariables: true };
            if (req_query_data != null && req_query_data != "") {
                const agent = new https.Agent({
                    rejectUnauthorized: false
                });
                let jsonRenderData = await axios(req_query_data, { headers: { 'Accept': 'application/json' }, httpsAgent: agent })
                RenderData = (jsonRenderData.data);
                liquidOptions = { strictVariables: false }
            }

            let engine = new LiquidJS.Liquid();

            // Sostituisce tutti gli url con le parentesi giuste
            let data_out = data.replace(/url:\/\/{{/g, "{{");

            let ln = req.cookies["Lang"]
            if (ln == null)
                ln = (req.headers["accept-language"].toLocaleLowerCase()).slice(0, 2)
            if (translator.TranslationData.Langs.indexOf(ln) < 0)
                ln = "it"

            let data_out_ts = translator.TranslateText(data_out, ln.toLocaleLowerCase(), file)
            let tpl = await engine.parse(data_out_ts)
            DataOut = await engine.render(tpl, RenderData, liquidOptions);
            translator.TranslationsFile.UpdateMissingKeys();
            translator.TranslationsFile.UpdateUsedKeys();
        }
        catch (Ex) {
            console.log(Ex)
            
            if(parcel.hmr != null)
                parcel.hmr.emitError(Ex);
        }

        res.send(DataOut);
    });

    if (parcel.options.publicURL != "")
        app.use(parcel.options.publicURL, express.static(parcel.options.outDir));

    app.use(express.static(parcel.options.outDir))
    console.log("Debug Builder server running at: http://localhost:1234")
    app.listen(cmdLine.port);
})();



