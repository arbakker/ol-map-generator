<template>
  <div id="map" ref="map-root"></div>
</template>

<script>
import Mustache from "mustache";

import { default as Map } from "ol/Map";
/* eslint-disable no-unused-vars */
import "ol/ol.css";
import { default as ImageLayer } from "ol/layer/Image";
import { default as ImageWMS } from "ol/source/ImageWMS";
import { default as TileLayer } from "ol/layer/Tile";
import { default as WMTS } from "ol/source/WMTS";
import { default as WMTSTileGrid } from "ol/tilegrid/WMTS";
import { get as getProjection } from "ol/proj";
import { getTopLeft, getWidth } from "ol/extent";
import {
  Circle as CircleStyle,
  Fill,
  Stroke,
  Style,
  Text,
  Icon,
} from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import { default as VectorSource } from "ol/source/Vector";
import { default as VectorLayer } from "ol/layer/Vector";
/* eslint-enable no-unused-vars */

import htmlTemplate from "raw-loader!../assets/templates/index.html.template";
import jsTemplate from "raw-loader!../assets/templates/script.js.template";
import importsTemplate from "raw-loader!../assets/templates/imports.js.template";

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
      importsTemplate: importsTemplate,
      map: {},
    };
  },
  mounted: function () {
    this.config.generator = true;
  },
  // TODO: replace getters and setters with vuex
  methods: {
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
      this.config.generator = false
      Promise.all(promises).then(() => {
        let renderConfig = {
          config: JSON.stringify(this.config),
          layersString: this.config.layers.map(x=> JSON.stringify(x))
        }
        const jsCode = Mustache.render(jsTemplate, renderConfig);
        // console.log('jsCode', jsCode)
        const htmlCode = Mustache.render(htmlTemplate, jsCode);
        console.log(htmlCode)
      });
    },
    updateMap() {
      this.config.generator = true
      let promises = this.getPrepareGenPromises();
      Promise.all(promises).then(() => {
        // template starts here
        // replace config declaration in actual template
        let config = this.config;

        let map;
        if (config.generator) {
          console.log("generator", config);
          this.$refs["map-root"].innerHTML = "";
          map = new Map({
            target: this.$refs["map-root"],
          });
        } else {
          map = new Map({
            target: "map",
          });
        }

        function lineStyle(config) {
          let colorString = `rgb(${config.color[0]},${config.color[1]},${config.color[2]})`;
          let dash = getDash(config);
          return {
            stroke: new Stroke({
              ...{
                color: colorString,
                width: config.width,
              },
              ...dash,
            }),
          };
        }

        function pointStyle(config) {
          // replace 2nd occurence in SVG - first path occurence is for white bg halo - https://stackoverflow.com/a/44568739
          // TOOD: maybe move to generator code
          let scale = 1.5;
          if ("iconSize" in config) {
            scale = config.iconSize;
          }
          let i = 0;
          let icon = config.svgIcon.replace(/<path/g, (match) =>
            ++i === 2 ? `<path fill="#${config.hexColor}"` : match
          );
          const src = "data:image/svg+xml;utf8," + escape(icon);
          return {
            image: new Icon({
              opacity: 1,
              src: src,
              scale: scale,
            }),
          };
        }

        function getDash(config) {
          const dashDic = {
            dashed: {
              lineDash: [4],
            },
            solid: {},
            dotted: {
              lineDash: [1, 4, 1, 4],
            },
            "dash-dotted": {
              lineDash: [9, 3, 3, 3],
            },
          };
          let dash;
          if (!Array.isArray(config.stroke)) {
            dash =
              config.stroke in dashDic
                ? dashDic[config.stroke]
                : dashDic["solid"];
          } else {
            dash = {
              lineDash: config.stroke,
            };
          }
          return dash;
        }

        function polygonStyle(config) {
          // TODO: fix default colors in generator code
          let colorString = `rgb(${config.color[0]},${config.color[1]},${config.color[2]})`;
          let fillColor = `rgba(${config.color[0]},${config.color[1]},${config.color[2]},0.2)`;
          if (!("stroke" in config)) {
            config.stroke = "dashed";
          }
          if (!("width" in config)) {
            config.width = 2;
          }
          let dash = getDash(config);
          return {
            stroke: new Stroke({
              ...{
                color: colorString,
                width: config.width,
              },
              ...dash,
            }),
            fill: new Fill({
              color: fillColor,
            }),
          };
        }

        function getStyle(config) {
          const styles = {
            Point: pointStyle,
            LineString: lineStyle,
            Polygon: polygonStyle,
          };
          let style = styles[config.geomType];
          if (
            typeof config.color === "string" &&
            config.color.split(",").length > 2
          ) {
            config.color = config.color.split(",");
          }
          return style(config);
        }

        function getStyleFunction(config) {
          // eslint-disable-next-line no-unused-vars
          return function (feature, resolution) {
            let symbolStyle = getStyle(config);
            if ("labels" in config && config.labels) {
              const placementDic = {
                Point: {
                  offsetX: 7,
                  offsetY: -7,
                  textAlign: "start",
                  overflow: true,
                },
                Polygon: {
                  textAlign: "center",
                  overflow: true,
                },
                LineString: {
                  offsetX: 6,
                  offsetY: -6,
                  textAlign: "start",
                },
              };
              let textStyle = {
                text: new Text({
                  ...{
                    text: feature.get(config.labelProperty),
                    scale: 1.3,
                    fill: new Fill({
                      color: "#000000",
                    }),
                    stroke: new Stroke({
                      color: "rgba(255, 255, 255, 0.8)",
                      width: 3,
                    }),
                  },
                  ...placementDic[config.geomType],
                }),
              };
              return new Style({
                ...textStyle,
                ...symbolStyle,
              });
            }
            return new Style(symbolStyle);
          };
        }

        function isValidHttpUrl(string) {
          let url;
          try {
            url = new URL(string);
          } catch (_) {
            return false;
          }

          return url.protocol === "http:" || url.protocol === "https:";
        }

        const projection = getProjection("EPSG:3857");
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / 256;
        const resolutions = new Array(19);
        const matrixIds = new Array(19);
        for (let z = 0; z < 19; ++z) {
          // generate resolutions and matrixIds arrays for this WMTS
          resolutions[z] = size / Math.pow(2, z);
          matrixIds[z] = z;
        }

        async function getResourceText(filename) {
          let response = await fetch(filename);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.text();
        }
        // eslint-disable-next-line no-unused-vars
        async function getFeatureData(config) {
          if (config.layerType === "featureLayer") {
            let ftCollection;
            if (isValidHttpUrl(config.source)) {
              let ftCollectionString = await getResourceText(config.source);
              ftCollection = JSON.parse(ftCollectionString);
            } else {
              ftCollection = config.source;
            }
            return { ftCollection: ftCollection, config: config };
          } else {
            // optionally retrieve metadata from service
            return { serviceUrl: config.serviceUrl, config: config };
          }
        }

        function postRender(evt) {
          let grayscale = evt.target.get("grayscale");
          evt.context.globalCompositeOperation = "color";
          if (evt.context.globalCompositeOperation === "color") {
            // operation is supported by browser
            evt.context.fillStyle = "rgba(255,255,255," + grayscale + ")";
            evt.context.fillRect(
              0,
              0,
              evt.context.canvas.width,
              evt.context.canvas.height
            );
          }
          evt.context.globalCompositeOperation = "source-over";
        }

        const promises = [];

        config.layersString = config.layers.map(x=> JSON.stringify(x))
        let template = `
        {{ #layersString}}
        promises.push(
            getFeatureData(
                {{{.}}}    
            )
        )
        {{/layersString}}`;
        let promisesJS = Mustache.render(template, config);
        eval(promisesJS);

        const layers = [];
        // resolve promises with all to maintain layer order
        Promise.all(promises).then((values) => {
          values.forEach((result) => {
            if (result.config.layerType === "featureLayer") {
              layers.push(
                new VectorLayer({
                  declutter: true,
                  source: new VectorSource({
                    features: new GeoJSON({
                      featureProjection: "EPSG:3857",
                    }).readFeatures(result.ftCollection),
                  }),
                  style: getStyleFunction(result.config),
                  opacity: result.config.opacity,
                })
              );
            } else if (result.config.layerType === "serviceLayer") {
              if (result.config.serviceType === "WMS") {
                layers.push(
                  new ImageLayer({
                    source: new ImageWMS({
                      url: result.config.serviceUrl,
                      params: { LAYERS: result.config.layerName }, // TODO: add style parameter
                      ratio: 1,
                    }),
                    ...("grayscale" in result.config && {
                      grayscale: result.config.grayscale,
                    }), // add property conditionally
                    ...("opacity" in result.config && {
                      opacity: result.config.opacity,
                    }),
                  })
                );
              } else if (result.config.serviceType === "WMTS") {
                layers.push(
                  new TileLayer({
                    source: new WMTS({
                      url: result.config.serviceUrl,
                      layer: result.config.layerName,
                      matrixSet: "EPSG:3857",
                      format: "image/png",
                      projection: projection,
                      tileGrid: new WMTSTileGrid({
                        origin: getTopLeft(projectionExtent),
                        resolutions: resolutions,
                        matrixIds: matrixIds,
                      }),
                      style: "default",
                      wrapX: true,
                    }),
                    ...("grayscale" in result.config && {
                      grayscale: result.config.grayscale,
                    }), // add property conditionally
                    ...("opacity" in result.config && {
                      opacity: result.config.opacity,
                    }),
                  })
                );
              }
            }
          });
          map.setLayers(layers);
          map.getLayers().forEach((lyr) => {
            let grayscale = lyr.get("grayscale");
            if (grayscale > 0) {
              lyr.on("postrender", postRender);
            }
          });
          // TODO: improve; assuming this executes after end of this function, might be race condition
          this.map = map;
          this.map.render();

          if (config.generator) {
            this.map.on("moveend", () => {
              this.updateMapState();
            });
          }
        });
        // promise returning viewOptions is expected instead of View object https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html#setView
        let viewConfigTemplate = `
        {{#location}}
        {
            "center": [{{ x }}, {{ y }}],
            "zoom": {{ z }}
        }
        {{/location}}
        {{^location }} //default location
        {
            "center": [564457.4160, 6783258.6045],
            "zoom": 7
        }
        {{/location}}`;
        let viewConfig = JSON.parse(
          Mustache.render(viewConfigTemplate, config)
        );
        // eslint-disable-next-line no-unused-vars
        const viewOptions = new Promise((resolve, reject) => {
          resolve(viewConfig);
        });

        let constrainBoundsTemplate = `{{#constrainBoundsEnabled }}
        map.once('postrender', function(event) {   
            setTimeout(() => {
                let mapExtent = map.getView().calculateExtent(map.getSize())
                
                viewConfig.extent = mapExtent
                const viewOptions = new Promise((resolve, reject) => {
                    resolve(
                        viewConfig
                    );
                });
                map.setView(viewOptions)
            }, 10);
        });
        {{/constrainBoundsEnabled }}`;
        let constrainSet = Mustache.render(
          constrainBoundsTemplate,
          this.config
        );
        eval(constrainSet);
        map.setView(viewOptions);
      });
    },
    updateMapState() {
      const view = this.map.getView();
      const center = view.getCenter();
      const x = parseFloat(center[0].toString());
      const y = parseFloat(center[1].toString());
      const z = parseInt(view.getZoom().toString());
      const newValue = {
        location: {
          x: x,
          y: y,
          z: z,
        },
      };
      Object.assign(this.config, newValue);
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
        console.log(svgUrl);
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
</style>
