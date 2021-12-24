<template>
  <v-app>
    <v-main>
      <div id="container">
        <div class="row">
          <map-map-control
            ref="mapMapControl"
            :config="config"
          ></map-map-control>
        </div>

        <div class="row form">
          <v-form>
            <v-card>
              <div class="text-overline mb-4">MAP SETTINGS</div>
              <v-card-text>
                <v-text-field v-model="title" label="Map Title"></v-text-field>

                <v-switch
                  v-model="constrainBoundsEnabled"
                  label="Constrain Map Extent"
                  style="margin-top: 0em"
                ></v-switch>
                <v-switch
                  :disabled="constrainBoundsEnabled"
                  v-model="lsControlEnabled"
                  label="Locatieserver Control"
                  style="margin-top: 0em"
                ></v-switch>
              </v-card-text>
              <v-card-actions>
                <v-btn v-on:click="updateMap()">Update Map</v-btn>
                <v-btn color="primary" v-on:click="generateHTML()"
                  >Download HTML</v-btn
                >
              </v-card-actions>
            </v-card>
            <v-card>
              <v-list-item-content style="padding-bottom: 0px">
                <div class="text-overline mb-4">LAYERS</div>
                <v-card-actions
                  v-if="!(addingServiceLayer || addingFeatureLayer)"
                >
                  <v-btn v-on:click="orderLayersEnabled = !orderLayersEnabled"
                    > <v-icon> mdi-reorder-horizontal</v-icon></v-btn
                  >
                  <v-speed-dial direction="right">
                    <template v-slot:activator>
                      <v-btn color="blue darken-2" dark>
                        <v-icon> mdi-plus </v-icon>
                      </v-btn>
                    </template>
                    <v-btn
                      dark
                      small
                      v-on:click="
                        newLayer = newServiceLayer();
                        addingServiceLayer = true;
                      "
                    >
                      + Service Layer
                    </v-btn>
                    <v-btn
                      v-on:click="
                        newLayer = newFeatureLayer();
                        addingFeatureLayer = true;
                      "
                      dark
                      small
                    >
                      + Feature Layer
                    </v-btn>
                  </v-speed-dial>
                </v-card-actions>
                <div
                  v-if="addingServiceLayer || addingFeatureLayer"
                  style="width: 50vw; padding: 0 24px 16px"
                >
                  <service-layer-list-item
                    v-if="addingServiceLayer"
                    :layer="newLayer"
                  ></service-layer-list-item>
                  <feature-layer-list-item
                    v-if="addingFeatureLayer"
                    :layer="newLayer"
                  ></feature-layer-list-item>
                  <v-card-actions>
                    <v-btn color="primary" v-on:click="addNewLayer()">OK</v-btn>
                    <v-btn
                      v-on:click="
                        addingServiceLayer
                          ? (addingServiceLayer = !addingServiceLayer)
                          : (addingFeatureLayer = !addingFeatureLayer)
                      "
                      >Cancel</v-btn
                    >
                  </v-card-actions>
                </div>
                <v-expansion-panels
                  accordion
                  v-if="!(addingServiceLayer || addingFeatureLayer)"
                  :disabled="orderLayersEnabled"
                >
                  <draggable v-model="layers" :disabled="!orderLayersEnabled">
                    <transition-group>
                      <layer-list-item
                        v-on:deleteLayer="onDeleteLayer"
                        v-for="item in layers"
                        :key="item.id"
                        :layer="item"
                      ></layer-list-item>
                    </transition-group>
                  </draggable>
                </v-expansion-panels>
              </v-list-item-content>
            </v-card>
          </v-form>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
import draggable from "vuedraggable";
// import ServiceLayerListItem from "./LayerListItem.vue";
import LayerListItem from "./LayerListItem.vue";
import MapMapControl from "./MapMapControl.vue";
import ServiceLayerListItem from "./ServiceLayerListItem.vue";
import FeatureLayerListItem from "./FeatureLayerListItem.vue";

import htmlTemplate from "raw-loader!../assets/templates/index.html.template";
import jsTemplate from "raw-loader!../assets/templates/script.js.template";

export default {
  components: {
    draggable,
    LayerListItem,
    MapMapControl,
    ServiceLayerListItem,
    FeatureLayerListItem,
  },
  name: "MapControl",
  props: {
    config: Object,
  },
  data: function () {
    return {
      jsTemplate: jsTemplate,
      htmlTemplate: htmlTemplate,
      orderLayersEnabled: false,
      addingServiceLayer: false,
      addingFeatureLayer: false,
      newLayer: {},
    };
  },
  mounted: function () {},
  beforeMount: function () {},
  // TODO: replace getters and setters with vuex
  computed: {
    title: {
      get: function () {
        return this.config.title;
      },
      set: function (newValue) {
        this.config.title = newValue;
      },
    },
    layers: {
      get: function () {
        return this.config.layers;
      },
      set: function (newValue) {
        this.config.layers = newValue;
      },
    },
    constrainBoundsEnabled: {
      get: function () {
        return this.config.constrainBoundsEnabled;
      },
      set: function (newValue) {
        if (newValue) {
          // constraining extent and enabling ls control leads to
          // weird user interaction, what happens if queried object
          // is outside extent?
          this.config.lsControlEnabled = false;
        }
        this.config.constrainBoundsEnabled = newValue;
      },
    },
    lsControlEnabled: {
      get: function () {
        return this.config.lsControlEnabled;
      },
      set: function (newValue) {
        this.config.lsControlEnabled = newValue;
      },
    },
  },
  methods: {
    onDeleteLayer(layer){
      this.layers =  this.layers.filter(x => x!==layer);
      this.updateMap();
    },
    uuid() {
      var uuidValue = "",
        k,
        randomValue;
      for (k = 0; k < 32; k++) {
        randomValue = (Math.random() * 16) | 0;

        if (k == 8 || k == 12 || k == 16 || k == 20) {
          uuidValue += "-";
        }
        uuidValue += (
          k == 12 ? 4 : k == 16 ? (randomValue & 3) | 8 : randomValue
        ).toString(16);
      }
      return uuidValue;
    },
    newServiceLayer() {
      return {
        id: this.uuid(),
        serviceType: "",
        serviceUrl: "",
        layerName: "",
        opacity: 1,
        grayscale: 0,
        layerType: "serviceLayer",
        title: "",
      };
    },
    newFeatureLayer() {
      return {
        id: this.uuid(),
        color: [],
        title: "",
        opacity: 1,
        labels: false,
        labelProperty: "",
        icon: "marker",
        iconSize: 2,
        layerType: "featureLayer",
        sourceType: "object",
        geomType: "",
        geoJson: {},
        svgIcon: ""
      };
    },
    addNewLayer() {
      this.layers.push(this.newLayer);
      this.addingServiceLayer
        ? (this.addingServiceLayer = !this.addingServiceLayer)
        : (this.addingFeatureLayer = !this.addingFeatureLayer);
      this.updateMap();
    },
    updateMap() {
      this.$refs.mapMapControl.updateMap();
    },
    generateHTML() {
      this.$refs.mapMapControl.generateCode();
    },
    action(e) {
      if (e === "edit") this.before = Object.assign([], this.layers);
      if (e === "undo") this.layers = this.before;
      this.editing = !this.editing;
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

.v-btn {
  float: left;
  margin-right: 1em;
}
.v-card {
  margin-bottom: 1em;
}
</style>
