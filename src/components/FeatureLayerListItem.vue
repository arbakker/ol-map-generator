<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      {{ layer.title }}
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-text-field v-model="title" label="Layer Title"></v-text-field>
      <v-radio-group v-model="sourceIsUrl">
        <v-radio label="GeoJSON URL" value="url"></v-radio>
        <v-radio label="GeoJSON Document" value="document"></v-radio>
      </v-radio-group>
      <v-text-field
        v-if="sourceIsUrl === 'url'"
        v-model="source"
        label="GeoJSON URL"
      ></v-text-field>
      <v-textarea
        v-if="sourceIsUrl === 'document'"
        label="GeoJSON Document"
        v-model="sourceDocument"
        hint="Hint text"
      ></v-textarea>
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
        v-if="isStrokeFeatureLayer"
        v-model="width"
        step="1"
        min="0"
        max="20"
        thumb-label
        label="Stroke Width"
      ></v-slider>
      <v-text-field
        v-if="isStrokeFeatureLayer"
        v-model="stroke"
        :rules="strokeRules"
      ></v-text-field>
      <v-slider
        v-if="!isStrokeFeatureLayer"
        v-model="iconSize"
        step="1"
        min="0"
        max="20"
        thumb-label
        label="Icon Size"
      ></v-slider>
      <v-select
        v-if="!isStrokeFeatureLayer"
        :items="icons"
        v-model="icon"
        label="Icon"
      ></v-select>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
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
    source: {
      get: function () {
        return this.layer.source;
      },
      set: function (newValue) {
        this.layer.source = newValue;
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
    grayscale: {
      get: function () {
        return this.layer.grayscale;
      },
      set: function (newValue) {
        this.layer.grayscale = newValue;
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
    isStrokeFeatureLayer: function () {
      // TODO:  add case when  source isnot url
      if (this.sourceIsUrl !== "url") {
        let geomType = this.source.features[0].geometry.type;
        geomType = geomType.replace("Multi", "");
        if (geomType === "Point") {
          return false;
        }
      }
      return true;
    },
    sourceDocument: function () {
      return JSON.stringify(this.source);
    },
    sourceIsUrl: function () {
      let url;
      try {
        url = new URL(this.source);
      } catch (_) {
        return "document";
      }
      return url.protocol === "http:" || url.protocol === "https:"
        ? "url"
        : "document";
    },
  },
  mounted: function () {},
  beforeMount() {
    if (!("opacity" in this.layer)) {
      this.layer.opacity = 1;
    }
    if (!("grayscale" in this.layer)) {
      this.layer.grayscale = 0;
    }
  },
  watch: {
    "actLayer.visible": {
      handler: function (old_val, new_val) {
        console.log(old_val, new_val);
      },
    },
  },
  methods: {},
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
