import {
    Fill,
    Stroke,
    Style,
    Text,
    Icon,
} from "ol/style";
import { default as ImageLayer } from "ol/layer/Image";
import { default as ImageWMS } from "ol/source/ImageWMS";
import { default as TileLayer } from "ol/layer/Tile";
import { default as WMTS } from "ol/source/WMTS";
import { default as WMTSTileGrid } from "ol/tilegrid/WMTS";
import { get as getProjection } from "ol/proj";
import { getTopLeft, getWidth } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";
import { default as VectorSource } from "ol/source/Vector";
import { default as VectorLayer } from "ol/layer/Vector";

export { MapGenerator as default };
// DO NOT REMOVE FOLLOWING COMMENT USED FOR EXTRACTING CODE WITHOUT IMPORTS
// CODEBODY //
const DEFAULT_STROKE_WIDTH = 2
const DEFAULT_ICON_SCALE = 1.5
const DEFAULT_DASHES = {
    "dashed": {
        lineDash: [4],
    },
    "dotted": {
        lineDash: [1, 4, 1, 4],
    },
    "dash-dotted": {
        lineDash: [9, 3, 3, 3],
    },
    "solid": {}
}

class MapGenerator {
    config = {}
    map = {}
    constructor (config, map) {
        this.config = config
        this.map = map
    }

    static pointStyle (layerConfig) {
        // replace 2nd occurence in SVG - first path occurence is for white bg halo - https://stackoverflow.com/a/44568739
        // TOOD: maybe move to generator code
        let scale = DEFAULT_ICON_SCALE;
        if ("iconSize" in layerConfig) {
            scale = layerConfig.iconSize;
        }
        let i = 0;
        let icon = layerConfig.svgIcon.replace(/<path/g, (match) =>
            ++i === 2 ? `<path fill="#${layerConfig.hexColor}"` : match
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

    static lineStyle (layerConfig) {
        let colorString = `rgb(${layerConfig.color[0]},${layerConfig.color[1]},${layerConfig.color[2]})`;
        let dash = MapGenerator.getDash(layerConfig);
        if (!("width" in layerConfig)) {
            layerConfig.width = DEFAULT_STROKE_WIDTH;
        }
        return {
            stroke: new Stroke({
                ...{
                    color: colorString,
                    width: layerConfig.width,
                },
                ...dash,
            }),
        };
    }

    static polygonStyle (layerConfig) {
        let colorString = `rgb(${layerConfig.color[0]},${layerConfig.color[1]},${layerConfig.color[2]})`;
        let fillColor = `rgba(${layerConfig.color[0]},${layerConfig.color[1]},${layerConfig.color[2]},0.2)`;
        if (!("width" in layerConfig)) {
            layerConfig.width = DEFAULT_STROKE_WIDTH;
        }
        let dash = MapGenerator.getDash(layerConfig);
        return {
            stroke: new Stroke({
                ...{
                    color: colorString,
                    width: layerConfig.width,
                },
                ...dash,
            }),
            fill: new Fill({
                color: fillColor,
            }),
        };
    }

    static getDash (layerConfig) {
        let dash;
        if (!Array.isArray(layerConfig.stroke)) {
            dash =
                layerConfig.stroke in DEFAULT_DASHES
                    ? DEFAULT_DASHES[layerConfig.stroke]
                    : DEFAULT_DASHES["solid"];
        } else {
            dash = {
                lineDash: layerConfig.stroke,
            };
        }
        return dash;
    }

    static getStyle (layerConfig) {
        const styles = {
            Point: MapGenerator.pointStyle,
            LineString: MapGenerator.lineStyle,
            Polygon: MapGenerator.polygonStyle,
        };
        let style = styles[layerConfig.geomType];
        if (
            typeof layerConfig.color === "string" &&
            layerConfig.color.split(",").length > 2
        ) {
            layerConfig.color = layerConfig.color.split(",");
        }
        return style(layerConfig);
    }

    static getStyleFunction (layerConfig) {
        return function (feature) {
            let symbolStyle = MapGenerator.getStyle(layerConfig);
            if ("labels" in layerConfig && layerConfig.labels) {
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
                            text: feature.get(layerConfig.labelProperty),
                            scale: 1.3,
                            fill: new Fill({
                                color: "#000000",
                            }),
                            stroke: new Stroke({
                                color: "rgba(255, 255, 255, 0.8)",
                                width: 3,
                            }),
                        },
                        ...placementDic[layerConfig.geomType],
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

    static isValidHttpUrl (string) {
        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }

    static async getResourceText (filename) {
        let response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    // eslint-disable-next-line no-unused-vars
    static async getFeatureData (layerConfig) {
        if (layerConfig.layerType === "featureLayer") {
            let ftCollection;
            if (MapGenerator.isValidHttpUrl(layerConfig.source)) {
                let ftCollectionString = await MapGenerator.getResourceText(layerConfig.source);
                ftCollection = JSON.parse(ftCollectionString);
            } else {
                ftCollection = layerConfig.source;
            }
            return { ftCollection: ftCollection, config: layerConfig };
        } else {
            // optionally retrieve metadata from service
            return { serviceUrl: layerConfig.serviceUrl, config: layerConfig };
        }
    }

    static postRender (e) {
        let grayscale = e.target.get("grayscale");
        e.context.globalCompositeOperation = "color";
        if (e.context.globalCompositeOperation === "color") {
            // operation is supported by browser
            e.context.fillStyle = "rgba(255,255,255," + grayscale + ")";
            e.context.fillRect(
                0,
                0,
                e.context.canvas.width,
                e.context.canvas.height
            );
        }
        e.context.globalCompositeOperation = "source-over";
    }

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
    }

    generateMap () {
        let map = this.map
        let config = this.config

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

        const promises = [];

        config.layersString = config.layers.map((x) => JSON.stringify(x));
        config.layers.forEach(element => {
            promises.push(
                MapGenerator.getFeatureData(
                    element
                )
            )
        });


        const layers = [];
        // resolve promises with all to maintain layer order

        Promise.all(promises).then((values) => {
            let i = 0;
            values.forEach((result) => {
                if (result.config.layerType === "featureLayer") {
                    i += 1;
                    layers.push(
                        new VectorLayer({
                            zIndex: i,
                            declutter: true,
                            source: new VectorSource({
                                features: new GeoJSON({
                                    featureProjection: "EPSG:3857",
                                }).readFeatures(result.ftCollection),
                            }),
                            style: MapGenerator.getStyleFunction(result.config),
                            opacity: result.config.opacity,
                        })
                    );
                } else if (result.config.layerType === "serviceLayer") {
                    i += 1;
                    if (result.config.serviceType === "WMS") {
                        let params = {LAYERS: result.config.layerName}
                        if (result.config.styleName){
                            params = {
                                ...params,
                                ...{ STYLES: result.config.styleName}
                            }
                        }
                        layers.push(
                            new ImageLayer({
                                zIndex: i,
                                source: new ImageWMS({
                                    url: result.config.serviceUrl,
                                    params: params, // TODO: add style parameter
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
                        i += 1;
                        layers.push(
                            new TileLayer({
                                zIndex: i,
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
                    lyr.on("postrender", MapGenerator.postRender);
                }
            });
            map.on("moveend", () => {
                this.updateMapState();
            });
        });
        let viewConfig = {
            center: [564457.416, 6783258.6045],
            zoom: 7,
        };
        if (config.location) {
            viewConfig = {
                center: [config.location.x, config.location.y],
                zoom: config.location.z,
            };
        }

        // eslint-disable-next-line no-unused-vars
        // promise returning viewOptions is expected instead of View object https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html#setView
        const viewOptions = new Promise((resolve) => {
            resolve(viewConfig);
        });
        map.setView(viewOptions);
        if (config.constrainBoundsEnabled) {
            map.once("postrender", function () {
                setTimeout(() => {
                    let mapExtent = map.getView().calculateExtent(map.getSize());

                    viewConfig.extent = mapExtent;
                    const viewOptions = new Promise((resolve) => {
                        resolve(viewConfig);
                    });
                    map.setView(viewOptions);
                }, 1);
            });
        }
    }
}
