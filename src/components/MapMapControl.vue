<template>
  <div>
    <div id="map" ref="map-root"></div>
    <h1 id="mapTitle">{{ config.title }}</h1>
  </div>
</template>

<script>
import Mustache from "mustache";
import LocatieServerControl from "../lib/LocatieServerControl.js";

import { default as Map } from "ol/Map";
/* eslint-disable no-unused-vars */
import "ol/ol.css";
import MapGenerator from '../lib/MapGenerator'
/* eslint-enable no-unused-vars */

import htmlTemplate from "raw-loader!../assets/templates/index.html.template";
import jsTemplate from "raw-loader!../assets/templates/script.js.template";

import mapGeneratorJS from "!raw-loader!../lib/MapGenerator.js";
import locatieServerControlJs from "!raw-loader!../lib/LocatieServerControl.js";

export default {
  components: {},
  name: "MapControl",
  props: {
    config: Object,
  },
  data: function () {
    return {
      jsTemplate: jsTemplate,
      htmlTemplate: htmlTemplate,
      map: {},
    };
  },
  mounted: function () {
    this.config.generator = true;
    this.updateMap();
  },
  // TODO: replace getters and setters with vuex
  methods: {
    download(filename, text) {
      var element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
      );
      element.setAttribute("download", filename);

      element.style.display = "none";
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    },
    getPrepareGenPromises() {
      let promises = [];
      this.config.layers.forEach((x) => {
        if ("color" in x) {
          // TODO: use default color
          x.hexColor = this.rgba2hex(x.color);
        }
        promises.push(
          this.getFeatureDataAndIcon(x).catch((error) => {
            console.log(error);
          })
        );
      });
      return promises;
    },
    generateCode() {
      let promises = this.getPrepareGenPromises();
      this.config.generator = false;
      Promise.all(promises).then(() => {  
        this.updateMapTemplate();
        
        let mapGeneratorCodeBody = mapGeneratorJS.split(`// CODEBODY //\n`)[1]
        let lsControlCodeBody = locatieServerControlJs.split(`// CODEBODY //\n`)[1]
      
        let renderConfig = {
          config: JSON.stringify(this.config),
          lsControlCode:  lsControlCodeBody,
          mapGeneratorCode:  mapGeneratorCodeBody
        };
        const jsCode = Mustache.render(jsTemplate, renderConfig);
        const htmlCode = Mustache.render(htmlTemplate, {
          jsCode: jsCode,
          ...this.config,
        });
        this.download("index.html", htmlCode);
      });
    },
    updateMapTemplate() {
      let config = this.config;
      console.log(config)
      let map;
      this.$refs["map-root"].innerHTML = "";
      map = new Map({
        target: this.$refs["map-root"],
      });

      if (config.lsControlEnabled) {
        if (!customElements.get(LocatieServerControl.name)) {
          customElements.define(
            LocatieServerControl.name,
            LocatieServerControl
          );
        }
        let lsControl = LocatieServerControl.createLsControl();
        lsControl.map = map;
        lsControl.enableLsControl(lsControl);
      }
      let mapGenerator = new MapGenerator(config, map)
      mapGenerator.generateMap()
      
    },
    updateMap() {
      this.config.generator = true;
      let promises = this.getPrepareGenPromises();
      Promise.all(promises).then(() => {
        this.config.layers.map((x) => console.log(x.title));
        // template starts here
        // replace config declaration in actual template
        this.updateMapTemplate();
      });
    },
    isValidHttpUrl(string) {
      let url;
      try {
        url = new URL(string);
      } catch (_) {
        return false;
      }
      return url.protocol === "http:" || url.protocol === "https:";
    },
    rgba2hex(orig) {
      let alpha = ((orig && orig[4]) || "").trim();
      var hex =
        (orig[0] | (1 << 8)).toString(16).slice(1) +
        (orig[1] | (1 << 8)).toString(16).slice(1) +
        (orig[2] | (1 << 8)).toString(16).slice(1);

      if (alpha === "") {
        alpha = 0o1;
      }
      // multiply before convert to HEX
      alpha = ((alpha * 255) | (1 << 8)).toString(16).slice(1);
      hex = hex + alpha;
      return hex;
    },
    async getGeometryType(ftLayer) {
      let ftCollection;
      if (this.isValidHttpUrl(ftLayer.source)) {
        let ftCollectionString = await this.getResourceText(ftLayer.source);
        ftCollection = JSON.parse(ftCollectionString);
      } else {
        ftCollection = ftLayer.source;
      }
      let geomType = ftCollection.features[0].geometry.type;
      geomType = geomType.replace("Multi", "");
      return geomType;
    },
    async getResourceText(filename) {
      let response = await fetch(filename);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    },
    async getFeatureDataAndIcon(ftLayer) {
      if (ftLayer.layerType === "serviceLayer") {
        return;
      }
      // eslint-disable-next-line no-unused-vars
      const geomType = await new Promise((resolve, _reject) => {
        resolve(this.getGeometryType(ftLayer));
      });
      ftLayer.geomType = geomType;
      if (geomType === "Point") {
        if (!("icon" in ftLayer)) {
          ftLayer.icon = "circle";
        }
        let svgUrl = `./icons/${ftLayer.icon}.svg`;
        // eslint-disable-next-line no-unused-vars
        let svgIcon = await new Promise((resolve, _reject) => {
          resolve(this.getResourceText(svgUrl));
        });
        const regexpSize = /(<path .*?\/>)/;
        const match = svgIcon.match(regexpSize);
        let pathEl = match[1];
        let pathElBg = pathEl.replace(
          "<path",
          '<path stroke="#ffffffCC" stroke-width="2px"'
        );
        svgIcon = svgIcon.replace(regexpSize, `${pathElBg}$&`);
        svgIcon = svgIcon.replace(
          'viewBox="0 0 15 15"',
          'viewBox="-2 -2 19 19"'
        );
        ftLayer.svgIcon = svgIcon.replace(/\n/g, "");
      }
    },
    htmlEncode(s) {
      var el = document.createElement("div");
      el.innerText = el.textContent = s;
      s = el.innerHTML;
      return s;
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.draggable-flex {
  display: inherit;
  flex-direction: column;
}
.v-expansion-panels {
  width: 50vw;
}

#container {
  display: flex;
  flex-direction: row;
  overflow: hidden;
  height: 100vh;
}

.row {
  flex: 1;
  height: 100vh;
  width: 50vw;
  overflow-y: auto;
  overflow-x: hidden;
  margin: unset;
}

.form {
  padding: 1em;
}

html,
body {
  height: 100%;
}

#map {
  height: 100vh;
  width: 50vw;
}

#mapTitle {
  position: absolute;
  left: 1em;
  bottom: 1em;
  background-color: #ffffffba;
  padding: 0.5em;
}
</style>
