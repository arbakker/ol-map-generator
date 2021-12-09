import WKT from 'ol/format/WKT'
import { Control } from 'ol/control'
import { default as VectorSource } from 'ol/source/Vector';
import { default as VectorLayer } from 'ol/layer/Vector';
import { Fill, Stroke, Style } from 'ol/style';
export { LocatieServerControl as default };
// DO NOT REMOVE FOLLOWING COMMENT USED FOR EXTRACTING CODE WITHOUT IMPORTS
// CODEBODY //
const LocatieServerControlCSS = `
button{
    border: solid 1px #cfd6e6;
    border-radius: 0 3px 3px 0;
    border-left: 0px;
    width: 3em;
}
.parentControl{
    background-color: white;
    height: 36px;
}
input{
    outline: none;
}
input[type=text]{
    border: solid 1px #cfd6e6;
    border-radius: 3px;
    width: 21em;
    padding-left: 0.5em;
}

select{
    border: solid 1px #cfd6e6;
    border-radius: 3px;
    width: 10em;
    padding-left: 0.5em;    
}

input[type=checkbox] {
    transform: scale(1.1);
}

input:focus{
    border: solid 2px #cfd6e6 !important;
}

#locationServerControl{
    display: flex;
    position: absolute;
    bottom: 2em;
    right: 2em;
}

@media only screen and (max-width: 1024px) {
  #locationServerControl{
    bottom: 3em;
    left: 0.5em;
  }
}
`
const LocatieServerControlHTML =
    `<div id="locationServerControl" class="parentControl">
    <input autoComplete="off" id="lsInput" class="control" type="text" placeholder="zoek in locatieserver" title="Zoek in PDOK Locatieserver" list="locatie-auto-complete">
    <datalist id="locatie-auto-complete"></datalist>
</div>`

class LocatieServerControl extends HTMLElement {
    static url = 'https://geodata.nationaalgeoregister.nl/locatieserver/v3'
    static layerId = 'c2ab2649-c4c2-4ec0-bcb0-ddf9a7eb25bc'
    static css = LocatieServerControlCSS
    static html = LocatieServerControlHTML
    static name = 'locatieserver-control'
    map = {}
    shadow = {}
    constructor () {
        super()
        const _style = document.createElement('style')
        const _template = document.createElement('template')
        _style.innerHTML = LocatieServerControl.css
        _template.innerHTML = LocatieServerControl.html
        this.shadow = this.attachShadow({ mode: 'open' })
        this.shadow.appendChild(_style)
        this.shadow.appendChild(_template.content.cloneNode(true))
        // note that event handles cannot be moved to seperate class method, otherwise it will not work
        this.shadow.getElementById('lsInput').addEventListener('input', (event) => {
            if (event.inputType === 'insertReplacementText' || event.inputType === undefined) {
                const options = this.shadow.getElementById('locatie-auto-complete').querySelectorAll('option')
                let id = ''
                for (let option of options) {
                    if (option.value === event.target.value) {
                        id = option.id
                    }
                }
                fetch(`${LocatieServerControl.url}/lookup?id=${id}&fl=id,geometrie_ll`)
                    .then((response) => {
                        return response.json()
                    })
                    .then((data) => {
                        const wktLoc = data.response.docs[0].geometrie_ll
                        const format = new WKT()
                        const feature = format.readFeature(wktLoc, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        })
                        const ext = feature.getGeometry().getExtent()
                        this.dispatchEvent(new CustomEvent('location-selected', { bubbles: true, composed: true, detail: { extent: ext, feature: feature } }))
                        this.shadow.getElementById('locatie-auto-complete').innerHTML = ''
                        this.shadow.getElementById('lsInput').blur()
                    })
            } else if (event.inputType.startsWith('deleteContent')) {
                if (event.target.value === "") {
                    this.dispatchEvent(new CustomEvent('location-cleared', { bubbles: true, composed: true, detail: {} }))
                }
            }
        })
        // note that event handles cannot be moved to seperate class method, otherwise it will not work
        this.shadow.getElementById('lsInput').addEventListener('keyup', (event) => {
            if (this.query === event.target.value) {
                return
            }
            this.query = event.target.value
            fetch(`${LocatieServerControl.url}/suggest?q=${this.query}`)
                .then((response) => {
                    return response.json()
                })
                .then((data) => {
                    if (data.response.docs.length > 0) {
                        let options = data.response.docs.map(x => `<option value="${x.weergavenaam}" id="${x.id}">`)
                        let optionsHtml = options.join('')
                        this.shadow.getElementById('locatie-auto-complete').innerHTML = optionsHtml
                    }
                })
        })
    }
    set map (val) {
        this.map = val;
    }
    static polygonStyle (config) {
        let colorString = `rgb(${config.color[0]},${config.color[1]},${config.color[2]})`;
        let fillColor = `rgba(${config.color[0]},${config.color[1]},${config.color[2]},0.2)`;
        if (!("width" in config)) {
            config.width = 2;
        }
        return {
            stroke: new Stroke({
                ...{
                    color: colorString,
                    width: config.width,
                },
            }),
            fill: new Fill({
                color: fillColor,
            }),
        };
    }

    connectedCallback () {
        this.shadow.addEventListener('keydown', (event) => {
            event.stopPropagation()
        })
    }

    locationClearedHandler () {
        let existingLsLayer = this.map.getLayers().getArray().find(x => {
            return 'values_' in x && x.values_.id === LocatieServerControl.layerId
        })
        if (existingLsLayer) {
            this.map.removeLayer(existingLsLayer)
        }
    }

    locationSelectedHandler (event) {
        let style = LocatieServerControl.polygonStyle({ color: [255, 255, 0], stroke: "solid", width: 4 })
        let ftLayer = new VectorLayer({
            id: LocatieServerControl.layerId,
            declutter: true,
            source: new VectorSource({
                features: [event.detail.feature]
            }),
            style: new Style(style),
            opacity: 0.4,
            zIndex: 9999
        })
        this.locationClearedHandler()
        this.map.addLayer(ftLayer)
        this.map.getView().fit(event.detail.extent, { maxZoom: 18, padding: [30, 30, 30, 30] })
    }
    static createLsControl () {
        return document.createElement(LocatieServerControl.name)
    }
    enableLsControl (lsControl) {
        let myControl = new Control({ element: lsControl })
        this.map.addControl(myControl)
        lsControl.addEventListener('location-selected', this.locationSelectedHandler, false)
        lsControl.addEventListener('location-cleared', this.locationClearedHandler, false)
    }
}
