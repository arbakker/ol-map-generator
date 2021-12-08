<template>
  <v-expansion-panel>
    <v-expansion-panel-header>
      {{ title }}
    </v-expansion-panel-header>
    <v-expansion-panel-content>
      <v-text-field v-model="title" label="Layer Title"></v-text-field>
      <v-text-field v-model="serviceUrl" label="Service Url"></v-text-field>
      <v-text-field v-model="layerName" label="Layer Name"></v-text-field>
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
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>

export default {
  components: {},
  name: "ServiceLayerListItem",
  props: {
    layer: Object,
  },
  data: function () {
    return {
    };
  },
  // TODO: replace with vuex
  computed:{
      title: {
        get: function () {
            return  this.layer.title
        },
        set: function (newValue) {
            this.layer.title = newValue
        }
      },
      serviceUrl: {
        get: function () {
            return  this.layer.serviceUrl
        },
        set: function (newValue) {
            this.layer.serviceUrl = newValue
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
      }
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
  methods: {
    click(){
        console.log(JSON.stringify(this.layer, null, 4))
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
