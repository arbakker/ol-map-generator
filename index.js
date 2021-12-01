import { default as Map } from 'https://esm.run/ol@6.9.0/src/Map';
import 'https://esm.run/mustache@4.2.0/mustache.js';
import 'https://cdn.jsdelivr.net/npm/ajv@6.12.6/dist/ajv.bundle.js'; // es6 module import only works for 6.X.X, see https://github.com/ajv-validator/ajv/issues/1381#issue-778838527
import {htmlEncode, getResourceText } from './util.js';

// define global map var that is imported by generated code
var map = {}; 

function copyToClipboard (button, idEl) {
    const content = document.getElementById(idEl).innerText
    navigator.clipboard.writeText(content).then(function () {
        button.classList.add('button-ok')
        setTimeout(() => {
            button.classList.remove('button-ok')
        }, 300)
    }, function (err) {
        button.classList.add('button-notok')
        alert(err)
        setTimeout(() => {
            button.classList.remove('button-notok')
        }, 300)
    });
}

function updateMapState (map) {
    const view = map.getView()
    const center = view.getCenter()
    const x = parseFloat(center[0].toString())
    const y = parseFloat(center[1].toString())
    const z = parseInt(view.getZoom().toString())
    const newValue = {
        location: {
            x: x,
            y: y,
            z: z
        }
    }
    updateJsonConfig(newValue)
}

function updateJsonConfig (value) {
    let config = JSON.parse(document.getElementById("jsonInput").innerText)
    const newConfig = Object.assign(config, value);
    document.getElementById("jsonInput").innerText = JSON.stringify(newConfig, null, 4)
}



function handleRejection (p) {
    return p.catch((error) => ({
        error
    }))
}
function waitForAll (...ps) {
    console.log(ps)
    return Promise.all(ps.map(handleRejection))
}



function refreshMap (htmlTemplate, codeTemplate, schemaObject) {
    document.getElementById('jsonInput').classList.remove('invalid')
    document.getElementById('errorMessage').classList.remove('show')

    let config = JSON.parse(document.getElementById("jsonInput").innerText)

    const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}
    const validate = ajv.compile(schemaObject)

    const valid = validate(
        config
    )
    if (!valid) {
        document.getElementById('jsonInput').classList.add('invalid')
        let errEl = document.getElementById('errorMessage')
        console.log(validate.errors)
        errEl.innerText = `${validate.errors[0].keyyword} ${validate.errors[0].message} - schemaPath: ${validate.errors[0].schemaPath}`
        errEl.classList.add("show")
    }
    const scriptId = "myInjectedScript"
    let scriptEl = document.getElementById(scriptId)
    if (scriptEl) {
        scriptEl.parentNode.removeChild(scriptEl);
    }
    scriptEl = document.createElement('script')
    scriptEl.id = scriptId
    scriptEl.type = 'module'
    map = {}
    document.getElementById('map').innerHTML = ''
    map = new Map({})
    map.on('moveend', function (e) {
        updateMapState(map)
    })
    let featureCollections  = config.featureCollections.filter(x => typeof x !== 'string' )
    let jsonUrls = config.featureCollections.filter(x => typeof x === 'string' )
    console.log(jsonUrls)


    let promises = jsonUrls.map(url=> getResourceText(url))
    console.log(promises)
    waitForAll(...promises).then(
        results=>{
            let featureCollectionsString = featureCollections.map(x => JSON.stringify(x))
            featureCollectionsString = featureCollectionsString.concat(results.map(x=>  JSON.stringify(JSON.parse(x))))
            config.featureCollectionsString = featureCollectionsString
            let jsCode = Mustache.render(
                codeTemplate
                , config);
            console.log(jsCode)
            scriptEl.text = jsCode
            document.head.appendChild(scriptEl)
            // the generated code imports the mapobject from this main script (index.js)
            // replace the import with an object instantiation, otherwise the generated code
            // will not work by itself
            jsCode = jsCode.replace(
                "import { map } from './index.js';",
                "var map = new Map({});"
            )
            config["jsCode"] = jsCode
            const htmlCode = Mustache.render(
                htmlTemplate,
                config
            )
            const htmlCodeEncoded = htmlEncode(htmlCode)
            document.getElementById('htmlOutput').innerHTML = htmlCodeEncoded
        }
    )

    
}


waitForAll(getResourceText('templates/index.html.template'), getResourceText('templates/script.js.template'), getResourceText('default-config.json'), getResourceText('schema.json')).
    then(
        results => {
            console.log(results)
            const htmlTemplate = results[0]
            const codeTemplate = results[1]
            const initConfig = JSON.parse(results[2])
            const jsonSchema = JSON.parse(results[3])
            document.getElementById("jsonInput").innerText = JSON.stringify(initConfig, null, 4)
            refreshMap(htmlTemplate, codeTemplate, jsonSchema)
            document.getElementById('refresh').addEventListener('click', (e) => refreshMap(htmlTemplate, codeTemplate, jsonSchema))
            document.getElementById('copyHTML').addEventListener('click', (e) => copyToClipboard(e.target, 'htmlOutput'))
            document.getElementById('copyJSON').addEventListener('click', (e) => copyToClipboard(e.target, 'jsonInput'))
        }
    );



export { map }