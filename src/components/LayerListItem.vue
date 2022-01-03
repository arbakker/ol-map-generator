<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      {{ layer.title }}
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <service-layer-list-item
        v-if="layer.layerType === 'serviceLayer'"
        :layer="layer"
      ></service-layer-list-item>
      <feature-layer-list-item
        v-if="layer.layerType === 'featureLayer'"
        :layer="layer"
      >
      </feature-layer-list-item>
      <v-card-actions>
        <v-btn @click="deleteLayer()" title="Delete Layer"
          ><v-icon> mdi-delete </v-icon></v-btn
        >
      </v-card-actions>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import ServiceLayerListItem from "./ServiceLayerListItem.vue";
import FeatureLayerListItem from "./FeatureLayerListItem.vue";
// import { Fragment } from 'vue-fragment'

export default {
  components: {
    // Fragment,
    ServiceLayerListItem,
    FeatureLayerListItem,
  },
  name: "LayerListItem",
  props: {
    layer: Object,
  },
  // TODO: replace with vuex
  computed: {},
  mounted: function () {},
  beforeMount() {},
  methods: {
    deleteLayer() {
      this.$emit("deleteLayer", this.layer);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.expansion-panel-wrapper {
  border-bottom: solid 1px rgb(218, 218, 218);
}
.v-expansion-panel {
  width: 50vw;
}
</style>
