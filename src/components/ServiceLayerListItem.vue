<template>
  <div>
      <v-text-field v-model="title" label="Layer Title"></v-text-field>
       <v-switch
              v-model="autoUpdateTitle"
              label="Auto-Update Title"
              style="margin-top: 0em"
            ></v-switch>
      <v-text-field disabled v-model="serviceType" label="Service Type"></v-text-field> 
       <v-radio-group v-model="inputMode">
        <v-radio label="Search in PDOK Services" value="search"></v-radio>
        <v-radio label="Input Service URL" value="input"></v-radio>
      </v-radio-group>

      <v-text-field
          v-show="inputMode === 'search'"
          type="text"
          v-model="query"
          list="searchResults"
          @keyup="search"
          @input="checkSelected"
          :placeholder="
            'zoek in PDOK services'
          "
        />
        <datalist id="searchResults">
            <option v-for="item in displayItems" :key="item.id">{{item.title}}</option>
        </datalist>
      <v-text-field
 v-model="displayServiceUrl" label="Service URL" :rules="serviceUrlRules" required ref="serviceUrl"></v-text-field>  
      <v-select
        :items="layers"
        v-model="selectedLayer"
        item-text="Title"
        label="Layer Name"
        return-object
      ></v-select>
       <v-select
        v-if="serviceType === 'WMS'"
        :items="selectedLayer.Style"
        v-model="selectedStyle"
        item-text="Title"
        return-object
        label="Style"
      ></v-select>
      <v-slider
        v-model="opacity"
        step="0.01"
        min="0"
        max="1"
        thumb-label
        label="Opacity"
      ></v-slider>  
      <v-slider
        v-model="grayscale"
        step="0.01"
        min="0"
        max="1"
        thumb-label
        label="Grayscale"
      ></v-slider>
    </div>
</template>

<script>
import WMSCapabilities from "ol/format/WMSCapabilities";
import WMTSCapabilities from "ol/format/WMTSCapabilities";
import Fuse from "fuse.js";
import pdokServices from '../assets/pdok-wms-wmts-services-with-urls.json'
// other imports

export default {
  components: {},
  name: "ServiceLayerListItem",
  props: {
    layer: Object,
    autoUpdateTitle: {
      type: Boolean,
      default: true
    },
  },
  data: function () {
    return {
      serviceTitle: "",
      inputMode: "search",
      displayItems: [], 
      displayServiceUrl: "",
      query: "",
      layers: [],
      styles: [],
      selectedLayer: {},
      selectedStyle: {},
      serviceUrlRules: [
        (value) => {
          const pattern = /^https?.*\?.*service=(WMS|WMTS).*$/i;
          return (
            pattern.test(value) ||
            "Invalid Service URL, service request parameter required (allowed values: WMS, WMTS)"
          );
        },
      ],
    };
  },
  computed:{
      title: {
        get: function () {
            return  this.layer.title
        },
        set: function (newValue) {
            this.layer.title = newValue
        }
      },
      layerName: {
        get: function () {
            return  this.layer.layerName
        },
        set: function (newValue) {
            this.layer.layerName = newValue
        }
      },
      styleName: {
        get: function () {
            return  this.layer.styleName
        },
        set: function (newValue) {
            this.layer.styleName = newValue
        }
      },
      opacity: {
        get: function () {
            return  this.layer.opacity
        },
        set: function (newValue) {
            this.layer.opacity = newValue
        }
      },
      grayscale: {
        get: function () {
            return  this.layer.grayscale
        },
        set: function (newValue) {
            this.layer.grayscale = newValue
        }
      },
      serviceType: {
        get: function () {
            return  this.layer.serviceType
        },
        set: function (newValue) {
            this.layer.serviceType = newValue
        }
      },
      serviceUrlValid: { 
        get: function(){
          const pattern = /^https?.*\?.*service=(WMS|WMTS).*$/i;
          return (pattern.test(this.displayServiceUrl))
        }
      },
  },
   watch: {
    displayServiceUrl: function (newVal){
      let url = new URL(newVal);
      let urlString =  `${url.protocol}//${url.hostname}${url.pathname}`
      this.layer.serviceUrl = urlString
      let serviceType = this.getServiceType()
            this.serviceType = serviceType
            setTimeout(() => {
                this.retrieveCapabilities()
            }, 1);
    },
    selectedLayer: function (newVal) {
      if (this.serviceType === "WMS"){
        this.layerName = newVal.Name
      }else{
        this.layerName = newVal.Identifier
      }
      if (this.autoUpdateTitle){
        this.updateTitle()
      }
      
    },
    selectedStyle: function (newVal) {
      this.styleName = newVal.Name
    }
  },
  mounted: function () {
    this.retrieveCapabilities()
    this.init(pdokServices)
  },
  beforeMount() {
    if (!("opacity" in this.layer)) {
      this.layer.opacity = 1;
    }
    if (!("grayscale" in this.layer)) {
      this.layer.grayscale = 0;
    }
  },
  methods: {
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
        keys: ["title", "abstract", "keywords", "id", "serviceUrl", "serviceType"],
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
    checkSelected(){
        let item = this.displayItems.find(element => element.title === this.query)
        if (item!==undefined){
          this.displayServiceUrl = item.serviceUrl
        }
 },
     search() {
      setTimeout(() => {
        this.displayItems = this.searchFilter();
      }, 300);
      
    },
    updateTitle(){
      let layerTitle = this.selectedLayer.Title
      this.title = `${this.serviceTitle} - ${layerTitle}` 
    },
    retrieveCapabilities(){
      if (!this.serviceUrlValid){
        return
      }
      if (this.serviceType === "WMTS"){
        this.retrieveCapabilitiesWMTS()
      }else if (this.serviceType === "WMS"){
        this.retrieveCapabilitiesWMS()
      }
    },
    retrieveCapabilitiesWMS(){
      let url = new URL(this.displayServiceUrl);
      let urlString =  `${url.protocol}//${url.hostname}${url.pathname}?request=GetCapabilities&service=WMS`;
      fetch(urlString)
        .then((response) => {
          return response.text();
        })
        .then((text) => {
          this.capXml = text;
          const parser = new WMSCapabilities();
          let parsedCap = parser.read(text);
          let layers = [];
          this.serviceTitle = parsedCap.Service.Title
          layers = this.unpackLayers(parsedCap.Capability, layers);
          // filter out duplicate layers (seems bug in gebiedsindelingen wms)
          layers = layers.filter(
            (v, i, a) => a.findIndex((t) => t.Name === v.Name) === i
          );
          // filter out duplicate styles, seems bug in cap parser
          layers.forEach((lyr) => {
            if ("Style" in lyr) {
              lyr.Style = lyr.Style.filter(
                (v, i, a) => a.findIndex((t) => t.Name === v.Name) === i
              );
            }
          });
          this.layers = layers;
          this.selectedLayer = (this.layerName) ? layers.find(x=> x.Name === this.layerName)  : layers[0]        
          let parentStyles = [];
          parentStyles = this.parentStyles(
            parsedCap.Capability,
            parentStyles
          ).flat();
          this.layers.map((x) => {
            if ("Style" in x)
              x.Style = x.Style.filter((y) => !parentStyles.includes(y));
          });
          this.selectedStyle = undefined
          if ("Style" in this.selectedLayer){
            this.selectedStyle = (this.styleName) ? this.selectedLayer.Style.find(x=>x.Name === this.styleName): this.selectedLayer.Style[0]
          }
          if (this.autoUpdateTitle){
              this.updateTitle()
          }
        });
    },
    parentStyles(capObj, result) {
      if (!Array.isArray(capObj)) {
        capObj = [capObj];
      }
      capObj.forEach((lyr) => {
        if ("Layer" in lyr) {
          result.push(lyr.Style);
          this.parentStyles(lyr.Layer, result);
        }
      });
      return result;
    },
    unpackLayers(capObj, result) {
      if (!Array.isArray(capObj)) {
        capObj = [capObj];
      }
      capObj.forEach((lyr) => {
        if ("Layer" in lyr) {
          this.unpackLayers(lyr.Layer, result);
        } else {
          result.push(lyr);
        }
      });
      return result;
    },
    retrieveCapabilitiesWMTS(){
      let url = new URL(this.displayServiceUrl);
      let urlString = `${url.protocol}//${url.hostname}${url.pathname}?request=GetCapabilities&service=WMTS`;
       fetch(urlString)
        .then((response) => {
          return response.text();
        })
        .then((text) => {
           this.capXml = text;
            const parser = new WMTSCapabilities();
            let parsedCap = parser.read(text);
            this.serviceTitle = parsedCap.ServiceIdentification.Title
            let layers = [];
            layers = parsedCap.Contents.Layer
            this.layers = layers;
            this.selectedLayer = (this.layerName) ? layers.find(x=> x.Identifier === this.layerName) : layers[0]
            if (this.autoUpdateTitle){
              this.updateTitle()
            }
      })

    },
    getServiceType(){
      var url = new URL(this.displayServiceUrl.toUpperCase());
      return url.searchParams.get("SERVICE");
    }
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


</style>
