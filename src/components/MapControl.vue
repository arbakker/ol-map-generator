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
          <v-container
    class="px-0"
    fluid
  >
            <v-text-field v-model="title" label="Map Title"></v-text-field>
            <v-switch
              v-model="constrainBoundsEnabled"
              label="Constrain Map Extent"
            ></v-switch>
            <v-switch
              v-model="lsControlEnabled"
              label="Locatieserver Control"
            ></v-switch>
                      <v-switch
              v-model="orderLayersEnabled"
              label="Order Layers"
            ></v-switch>
            <v-expansion-panels :disabled="orderLayersEnabled" >
              <draggable v-model="layers"  :disabled="!orderLayersEnabled">
                <transition-group>
                    <layer-list-item
                      v-for="item in layers"
                      :key="item.id"
                      :layer="item"
                    ></layer-list-item>
                  
                </transition-group>
              </draggable>
            </v-expansion-panels>
            <v-btn v-on:click="updateMap()" elevation="2" large
              >Update Map</v-btn>
              <v-btn v-on:click="generateHTML()" elevation="2" large
              >Generate HTML</v-btn>
          </v-container>
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

import htmlTemplate from "raw-loader!../assets/templates/index.html.template";
import jsTemplate from "raw-loader!../assets/templates/script.js.template";

export default {
  components: {
    draggable,
    LayerListItem,
    MapMapControl,
  },
  name: "MapControl",
  props: {
    config: Object,
  },
  data: function () {
    return {
      jsTemplate: jsTemplate,
      htmlTemplate: htmlTemplate,
      orderLayersEnabled: false
    };
  },
  mounted: function () {
    
  },
  beforeMount: function(){
    
  },
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
        console.log("AAAAA")
        newValue.map(x=> console.log(x.title))
        this.config.layers = newValue;
      },
    },
    constrainBoundsEnabled: {
      get: function () {
        return this.config.constrainBoundsEnabled;
      },
      set: function (newValue) {
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
    updateMap() {
      this.$refs.mapMapControl.updateMap();
    },
    generateHTML(){
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
</style>
