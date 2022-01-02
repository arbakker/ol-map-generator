<template>
  <div>
      <v-text-field v-model="title" label="Layer Title"></v-text-field>
      <v-radio-group v-model="sourceType">
        <v-radio label="GeoJSON Document" value="object"></v-radio>
        <v-radio label="GeoJSON URL" value="url"></v-radio>
      </v-radio-group>
      <v-text-field
        v-if="sourceType === 'url'"
        v-model="geoJsonUrl"
        label="GeoJSON URL"
      ></v-text-field>
      <v-textarea
        v-if="sourceType === 'object'"
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
        v-if="geomType !== '' && geomType!=='Point'"
        v-model="width"
        step="1"
        min="0"
        max="20"
        thumb-label
        label="Stroke Width"
      ></v-slider>
      <v-text-field
        v-if="geomType !== '' && geomType!=='Point'"
        v-model="stroke"
        :rules="strokeRules"
      ></v-text-field>
      <v-slider
        v-if="geomType !== '' && geomType==='Point'"
        v-model="iconSize"
        step="1"
        min="1"
        max="10"
        thumb-label
        label="Icon Size"
      ></v-slider>
      <v-select
        v-if="geomType !== '' && geomType==='Point'"
        :items="icons"
        v-model="icon"
        label="Icon"
      ></v-select>
    </div>
</template>

<script>
//@blur="geoJsonString = $event.target.value"
import availableIcons from "../assets/icons.json";

export default {
  components: {},
  name: "FeatureLayerListItem",
  props: {
    layer: Object,
  },
  data: function () {
    return {
      icons: availableIcons,
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
        return JSON.stringify(this.geoJson)
      },
      set: function (newValue) {
        this.geoJson = JSON.parse(newValue)
        this.setSourceGeomType()
      },
    },
    geoJson: {
      get: function () {
        return this.layer.geoJson
      },
      set: function (newValue) {
        this.layer.geoJson = newValue
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
        this.getIcon(newValue).then(result=>{
          this.layer.svgIcon = result
        })
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
  },
  beforeMount() {
    if (!("opacity" in this.layer)) {
      this.layer.opacity = 1;
    }
    if (!("grayscale" in this.layer)) {
      this.layer.grayscale = 0;
    }
  },
  watch: {
  },
  methods: {

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
      svgIcon = svgIcon.replace(
        'viewBox="0 0 15 15"',
        'viewBox="-2 -2 19 19"'
      );
      return svgIcon.replace(/\n/g, "");
    },
    setSourceGeomType(){
      let geomType
      if (this.sourceType === "object"){
        geomType = this.geoJson.features[0].geometry.type;
      }else if (this.sourceType === "url"){
        geomType = this.geoJson.features[0].geometry.type;
      }
      let newGeomType =  geomType.replace("Multi", "");
      this.geomType = newGeomType
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

.v-expansion-panel {
  width: 50vw;
}
</style>
