<template>
  <div>
    <v-text-field v-model="title" label="Layer Title"></v-text-field>
     <v-switch
              v-show="sourceType === 'service'"
              v-model="autoUpdateTitle"
              label="Auto-Update Title"
              style="margin-top: 0em"
            ></v-switch>
    <v-radio-group v-model="sourceType">
      <v-radio label="GeoJSON Document" value="object"></v-radio>
      <v-radio label="GeoJSON URL" value="url"></v-radio>
      <v-radio label="PDOK WFS Service" value="service"></v-radio>
    </v-radio-group>
    <v-text-field
      v-show="sourceType === 'service'"
      type="text"
      v-model="query"
      list="searchResults"
      @keyup="search"
      @input="checkSelected"
      :placeholder="'zoek in PDOK WFS services'"
    />
    <datalist id="searchResults">
      <option v-for="item in displayItems" :key="item.id">
        {{ item.title }}
      </option>
    </datalist>
    <v-text-field
      v-show="sourceType === 'service'"
      disabled
      v-model="displayServiceUrl"
      label="Service URL"
      required
      ref="serviceUrl"
    ></v-text-field>
    <v-select
        :disabled="featureTypes.length === 0"
        v-show="sourceType === 'service'"
        :items="featureTypes"
        v-model="selectedFeatureType"
        item-text="Title"
        label="Selected FeatureType"
        return-object
      ></v-select>
      <v-slider
      v-model="nrFeatures"
      step="10"
      min="0"
      max="1000"
      thumb-label
      label="Number of Features"
    ></v-slider>

    <v-text-field
      v-if="sourceType === 'url'"
      v-model="geoJsonUrl"
      label="GeoJSON URL"
    ></v-text-field>
    <v-textarea
      v-if="sourceType === 'object'"
      :rules="geojsonRules"
      label="GeoJSON Document"
      hint="Hint text"
      v-model="geoJsonString"
    ></v-textarea>
    <v-slider
      v-model="opacity"
      step="0.01"
      min="0"
      max="1"
      thumb-label
      label="Opacity"
    ></v-slider>
    <v-color-picker
      v-model="color"
      label="Style Color"
      dot-size="20"
      mode="rgba"
      hide-inputs
    ></v-color-picker>
    <v-checkbox v-model="labels" label="Enable Labels"></v-checkbox>
    <v-text-field
      :disabled="!labels"
      v-model="labelProperty"
      label="Label Property"
    ></v-text-field>
    <v-slider
      v-if="geomType !== '' && geomType !== 'Point'"
      v-model="width"
      step="1"
      min="0"
      max="20"
      thumb-label
      label="Stroke Width"
    ></v-slider>
    <v-text-field
      v-if="geomType !== '' && geomType !== 'Point'"
      v-model="stroke"
      :rules="strokeRules"
    ></v-text-field>
    <v-slider
      v-if="geomType !== '' && geomType === 'Point'"
      v-model="iconSize"
      step="1"
      min="1"
      max="10"
      thumb-label
      label="Icon Size"
    ></v-slider>
    <v-select
      v-if="geomType !== '' && geomType === 'Point'"
      :items="icons"
      v-model="icon"
      label="Icon"
    ></v-select>
  </div>
</template>

<script>
//@blur="geoJsonString = $event.target.value"
import availableIcons from "../assets/icons.json";
import Fuse from "fuse.js";

import pdokWFSServices from "../assets/pdok-wfs-services-with-urls.json";

import Jsonix from "jsonix";

var WFS_2_0 = require("ogc-schemas").WFS_2_0;
var OWS_1_1_0 = require("ogc-schemas").OWS_1_1_0;
var Filter_2_0 = require("ogc-schemas").Filter_2_0;
var XLink_1_0 = require("w3c-schemas").XLink_1_0;

export default {
  components: {},
  name: "FeatureLayerListItem",
  props: {
    layer: Object,
    autoUpdateTitle: {
      type: Boolean,
      default: true
    },
  },
  data: function () {
    return {
      capXml: "",
      query: "",
      displayItems: [],
      serviceTitle: "",
      icons: availableIcons,
      displayServiceUrl: "",
      featureTypes: [],
      selectedFeatureType: null,
      geojsonRules: [
        (value) => {
          try {
            console.log(value);
            JSON.parse(value);
          } catch (e) {
            return "Invalid JSON Document";
          }
          return true;
        },
      ],
      strokeRules: [
        (value) => {
          const pattern = /^^([0-9]+\s?,?){2,}$$/;
          return (
            pattern.test(value) ||
            "Invalid stroke, comma seperated integers required"
          );
        },
      ],
    };
  },
  computed: {
    sourceType: {
      get: function () {
        return this.layer.sourceType;
      },
      set: function (newValue) {
        this.layer.sourceType = newValue;
      },
    },
    nrFeatures: {
      get: function () {
        return this.layer.nrFeatures;
      },
      set: function (newValue) {
        this.layer.nrFeatures = newValue;
      },
    },
    geoJsonUrl: {
      get: function () {
        return this.layer.geoJsonUrl;
      },
      set: function (newValue) {
        this.layer.geoJsonUrl = newValue;
      },
    },
    geomType: {
      get: function () {
        return this.layer.geomType;
      },
      set: function (newValue) {
        this.layer.geomType = newValue;
      },
    },
    geoJsonString: {
      get: function () {
        return JSON.stringify(this.geoJson);
      },
      set: function (newValue) {
        this.geoJson = JSON.parse(newValue);
        this.setSourceGeomType();
      },
    },
    geoJson: {
      get: function () {
        return this.layer.geoJson;
      },
      set: function (newValue) {
        this.layer.geoJson = newValue;
      },
    },
    labels: {
      get: function () {
        return this.layer.labels;
      },
      set: function (newValue) {
        this.layer.labels = newValue;
      },
    },
    labelProperty: {
      get: function () {
        return this.layer.labelProperty;
      },
      set: function (newValue) {
        this.layer.labelProperty = newValue;
      },
    },
    iconSize: {
      get: function () {
        return this.layer.iconSize;
      },
      set: function (newValue) {
        this.layer.iconSize = newValue;
      },
    },
    icon: {
      get: function () {
        return this.layer.icon;
      },
      set: function (newValue) {
        this.layer.icon = newValue;
        this.getIcon(newValue).then((result) => {
          this.layer.svgIcon = result;
        });
      },
    },
    title: {
      get: function () {
        return this.layer.title;
      },
      set: function (newValue) {
        this.layer.title = newValue;
      },
    },
    width: {
      get: function () {
        return this.layer.width;
      },
      set: function (newValue) {
        this.layer.width = newValue;
      },
    },
    opacity: {
      get: function () {
        return this.layer.opacity;
      },
      set: function (newValue) {
        this.layer.opacity = newValue;
      },
    },
    stroke: {
      get: function () {
        if (!this.layer.stroke) {
          return "";
        }
        return this.layer.stroke.join(",");
      },
      set: function (newValue) {
        this.layer.stroke = newValue.split(",").map((x) => parseInt(x.trim()));
      },
    },
    color: {
      get: function () {
        let colorObj = {
          r: this.layer.color[0],
          g: this.layer.color[1],
          b: this.layer.color[2],
          a: 1,
        };
        return colorObj;
      },
      set: function (newValue) {
        this.layer.color = [newValue.r, newValue.g, newValue.b];
      },
    },
  },
  mounted: function () {
    this.init(pdokWFSServices);
  },
  beforeMount() {
    if (!("opacity" in this.layer)) {
      this.layer.opacity = 1;
    }
    if (!("grayscale" in this.layer)) {
      this.layer.grayscale = 0;
    }
     if (!("nrFeatures" in this.layer)) {
      this.layer.nrFeatures = 500;
    }
  },
  watch: {
    selectedFeatureType: function(){
      if (this.autoUpdateTitle){
        this.updateTitle()
      }
      this.setSourceGeomType()
    },
    displayServiceUrl: function (newVal) {
      setTimeout(() => {
        this.retrieveCapabilitiesWFS();
      }, 1);
      this.layer.serviceUrl = newVal
    },
  },
  methods: {
    updateTitle(){
      let layerTitle = this.selectedFeatureType.Title
      this.title = `${this.serviceTitle} - ${layerTitle}` 
    },
    checkSelected() {
      let item = this.displayItems.find(
        (element) => element.title === this.query
      );
      if (item !== undefined) {
        this.displayServiceUrl = item.serviceUrl;
      }
    },
    retrieveCapabilitiesWFS() {
      let url = new URL(this.displayServiceUrl);
      let urlString = `${url.protocol}//${url.hostname}${url.pathname}?request=GetCapabilities&service=WFS`;
      fetch(urlString)
        .then((response) => {
          return response.text();
        })
        .then((text) => {
          this.capXml = text;
          let context = new Jsonix.Context([
            XLink_1_0,
            Filter_2_0,
            OWS_1_1_0,
            WFS_2_0,
          ]);
          let unmarshaller = context.createUnmarshaller();
          let wfsObject = unmarshaller.unmarshalString(text);
          this.featureTypes = [];
          wfsObject.value.featureTypeList.featureType.forEach((ft) => {
            let ftName = `${ft.name.prefix}:${ft.name.localPart}`;
            let ftTitle = ft.title[0].value;
            let ftAbstract = ft._abstract[0].value;
            this.featureTypes.push({
              Name: ftName,
              Title: ftTitle,
              Abstract: ftAbstract,
            });
          });
          this.serviceTitle = wfsObject.value.serviceIdentification.title[0].value
          this.selectedFeatureType = this.featureTypes[0]
         
        });
    },
    init(result) {
      // filter out duplicate records, ngr returns duplicated records occasionally
      result = result.filter(
        (v, i, a) => a.findIndex((t) => t.id === v.id) === i
      );
      this.records = result;
      this.displayItems = result;
      const options = {
        shouldSort: true,
        threshold: 0.3,
        location: 0,
        distance: 100,
        minMatchCharLength: 3,
        ignoreLocation: true,
        keys: [
          "title",
          "abstract",
          "keywords",
          "id",
          "serviceUrl",
          "serviceType",
        ],
      };
      this.fuse = new Fuse(this.records, options);
      this.search();
    },
    searchFilter() {
      if (this.query === "") {
        return this.records;
      }
      const searchResult = this.fuse.search(this.query, {});
      return searchResult.map(({ item }) => item).sort(this.compare);
    },
    search() {
      setTimeout(() => {
        this.displayItems = this.searchFilter();
      }, 300); // not sure what the timeout is required for
    },
    async getIcon() {
      let svgUrl = `./icons/${this.icon}.svg`;
      let response = await fetch(svgUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let svgIcon = await response.text();
      const regexpSize = /(<path .*?\/>)/;
      const match = svgIcon.match(regexpSize);
      let pathEl = match[1];
      let pathElBg = pathEl.replace(
        "<path",
        '<path stroke="#ffffffCC" stroke-width="2px"'
      );
      svgIcon = svgIcon.replace(regexpSize, `${pathElBg}$&`);
      svgIcon = svgIcon.replace('viewBox="0 0 15 15"', 'viewBox="-2 -2 19 19"');
      return svgIcon.replace(/\n/g, "");
    },
    updateServiceGeoJSONUrl(){
      // let url = new URL(this.displayServiceUrl);
      // let urlString = `${url.protocol}//${url.hostname}${url.pathname}?request=GetFeature&version=2.0.0&outputFormat=application/json&service=WFS&typeName=${this.selectedFeatureType.Name}&count=1&srsname=EPSG:4326`;


    },
    setSourceGeomType() {
      // TODO: dynamically retrieve sourcegeometrytype from remote resources
      let p1
      if (this.sourceType === "object") {
        p1 = new Promise(function(resolve) {
          resolve(this.geoJson);
        });
      } else if (this.sourceType === "url") {
        p1 = fetch(this.geoJsonUrl)
      } else if (this.sourceType === "service") {
        let url = new URL(this.displayServiceUrl);
        let urlString = `${url.protocol}//${url.hostname}${url.pathname}?request=GetFeature&version=2.0.0&outputFormat=application/json&service=WFS&typeName=${this.selectedFeatureType.Name}&count=1`;
        p1 = fetch(urlString)
      }
      p1.then(response => response.json())
      .then(data => 
      {
        console.log(data)
        let newGeomType = data.features[0].geometry.type;
        newGeomType = newGeomType.replace("Multi", "");
        this.geomType = newGeomType;
        console.log("this.geomType", this.geomType)

      });


    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

#app {
  margin: 40px;
}
.draggable-flex {
  display: inherit;
  flex-direction: inherit;
}

.v-expansion-panel {
  width: 50vw;
}
</style>
