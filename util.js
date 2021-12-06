async function getResourceText (filename) {
    let response = await fetch(filename);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}

function htmlEncode (s) {
    var el = document.createElement("div");
    el.innerText = el.textContent = s;
    s = el.innerHTML;
    return s;
}
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
    if (ftLayer.layerType ==="serviceLayer"){
        return
    }
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
export { htmlEncode, getResourceText, getFeatureDataAndIcon, getGeometryType, refreshTitle, waitForAll, updateMapState, rgba2hex, copyToClipboard, COLORS }