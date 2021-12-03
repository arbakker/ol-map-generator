import { default as Map } from 'https://esm.run/ol@6.9.0/src/Map';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'https://esm.run/ol@6.9.0/src/style';
import 'https://esm.run/mustache@4.2.0/mustache.js';
import 'https://cdn.jsdelivr.net/npm/ajv@6.12.6/dist/ajv.bundle.js'; // es6 module import only works for 6.X.X, see https://github.com/ajv-validator/ajv/issues/1381#issue-778838527
import { htmlEncode, getResourceText } from './util.js';


const COLORS = {
    "black": [0, 0, 0],
    "silver": [192, 192, 192],
    "gray": [128, 128, 128],
    "white": [255, 255, 255],
    "maroon": [128, 0, 0],
    "red": [255, 0, 0],
    "purple": [128, 0, 128],
    "fuchsia": [255, 0, 255],
    "green": [0, 128, 0],
    "lime": [0, 255, 0],
    "olive": [128, 128, 0],
    "yellow": [255, 255, 0],
    "navy": [0, 0, 128],
    "blue": [0, 0, 255],
    "teal": [0, 128, 128],
    "aqua": [0, 255, 255]
}

function isValidHttpUrl (string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

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
function rgba2hex (orig) {
    let alpha = (orig && orig[4] || "").trim()
    var hex = (orig[0] | 1 << 8).toString(16).slice(1) +
        (orig[1] | 1 << 8).toString(16).slice(1) +
        (orig[2] | 1 << 8).toString(16).slice(1);

    if (alpha === "") {
        alpha = 0o1;
    }
    // multiply before convert to HEX
    alpha = ((alpha * 255) | 1 << 8).toString(16).slice(1)
    hex = hex + alpha;
    return hex;
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
    return Promise.all(ps.map(handleRejection))
}


function refreshTitle (title) {
    let titleEl = document.getElementById("mapTitle")
    titleEl.innerText = title
    if (title !== "") {
        titleEl.style.display = 'block';
    } else {
        titleEl.style.display = 'none';
    }
}

// TODO: add check if returned geometry is valid geojson
async function getGeometryType (ftLayer) {
    let ftCollection
    if (isValidHttpUrl(ftLayer.source)){
        let ftCollectionString = await getResourceText(ftLayer.source)
        ftCollection = JSON.parse(ftCollectionString)
    }else{
        ftCollection = ftLayer.source
    }
    let geomType = ftCollection.features[0].geometry.type
    geomType = geomType.replace("Multi", "")
    return geomType
}

// TODO: improve error handling promises
async function getFeatureDataAndIcon(ftLayer) {
    const geomType = await new Promise((resolve, reject) => {
        resolve(getGeometryType(ftLayer))
    });
    ftLayer.geomType = geomType
    if (geomType === "Point") {
        if (!("icon" in ftLayer)) {
            ftLayer.icon = "circle"
        }
        let svgUrl = `./icons/${ftLayer.icon}.svg`
        let svgIcon = await new Promise((resolve, reject) => {
            resolve(getResourceText(svgUrl))
        });
        const regexpSize = /(<path .*?\/>)/;
        const match = svgIcon.match(regexpSize);
        let pathEl = match[1]
        let pathElBg = pathEl.replace('<path', '<path stroke="#ffffffCC" stroke-width="2px"')
        svgIcon = svgIcon.replace(regexpSize, `${pathElBg}$&`);
        svgIcon = svgIcon.replace('viewBox="0 0 15 15"', 'viewBox="-2 -2 19 19"')
        ftLayer.svgIcon = svgIcon.replace(/\n/g, "")
    }
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
    refreshTitle(config.title)

    // let iconFeatureLayers  = config.featureLayers.filter(x => "icon" in x)
    // let svgUrls = iconFeatureLayers.map(x => `./icons/${x.icon}.svg`)
    // let promises = svgUrls.map(url=> getResourceText(url))
    let promises = []
    config.featureLayers.forEach(x => {
        if ("color" in x) { // TODO: use default color
            if (x.color in COLORS) {
                x.color = COLORS[x.color]
            }
            x.hexColor = rgba2hex(x.color)
        }
        promises.push(getFeatureDataAndIcon(x).catch((error)=>{
            console.log(error)
        }))
    })

    // TODO: move templates to seperate file and fetch with seperate request
    var wmsTemplate = `new ImageLayer({
        extent: [-100267.6894, 6337518.8850, 1671848.3744, 7255986.2169],
        source: new ImageWMS({
            url: '{{{ serviceUrl }}}',
            params: { 'LAYERS': '{{ layerName }}' },
            ratio: 1
        }),
        {{ #opacity}}
        opacity: {{ opacity }},
        {{ /opacity }}
        {{ #grayscale}}
        grayscale: {{ grayscale }},
        {{ /grayscale }}
    }),`
    var wmtsTemplate = `new TileLayer({
        source: new WMTS({    
            url: '{{{ serviceUrl }}}',
            layer: '{{ layerName }}',
            matrixSet: 'EPSG:3857',
            format: 'image/png',
            projection: projection,
            tileGrid: new WMTSTileGrid({
                origin: getTopLeft(projectionExtent),
                resolutions: resolutions,
                matrixIds: matrixIds,
            }),
            style: 'default',
            wrapX: true,
        }),
        {{ #opacity}}
        opacity: {{ opacity }},
        {{ /opacity }}
        {{ #grayscale}}
        grayscale: {{ grayscale }},
        {{ /grayscale }}
    }),`

    waitForAll(...promises).then(
        () => {
            config.featureLayers = config.featureLayers.map(x => {
                let source = x.source
                source = JSON.stringify(source)
                x.source = source
                return x
            })
            config["layer_renderer"] = function () {
                return Mustache.render('{{> ' + this.serviceType + '}}', this, { WMTS: wmtsTemplate, WMS: wmsTemplate, });
            }
            let jsCode = Mustache.render(
                codeTemplate
                , config);
            // console.log('jsCode', jsCode)
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


waitForAll(getResourceText('./templates/index.html.template'), getResourceText('./templates/script.js.template'), getResourceText('./default-config.json'), getResourceText('./schema.json')).
    then(
        results => {
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