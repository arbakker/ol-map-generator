<template>
  <div id="app">
    <map-control :config="config" />
  </div>
</template>

<script>
import MapControl from "./components/MapControl.vue";
import initConfig from "./init-config.json";


export default {
  name: "App",
  data: function () {
    return {
      config: initConfig,
    };
  },
  mounted: function () {},
  components: {
    MapControl: MapControl,
  },
};
</script>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
html{
  overflow:hidden;
}
</style>
