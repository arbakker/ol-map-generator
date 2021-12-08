<template>
    <div class="expansion-panel-wrapper">
        <service-layer-list-item
                            v-if="layer.layerType === 'serviceLayer'"
                            :layer="layer"
                        ></service-layer-list-item>
        <feature-layer-list-item
                v-if="layer.layerType === 'featureLayer'"
            :layer="layer"
        ></feature-layer-list-item>
        
    </div>
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
  computed:{
  },
  mounted: function () {},
  beforeMount() {
  },
  methods: {
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    .expansion-panel-wrapper{
        border-bottom: solid 1px rgb(218, 218, 218);
    }
</style>
