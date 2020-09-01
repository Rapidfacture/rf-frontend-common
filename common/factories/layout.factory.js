/**
 * @module layoutFactory
 * @desc
 * individualise colors, logos
 *
 * @version 0.1.0
 */

app.factory('layoutFactory', ['config', 'http', 'loginFactory',
   function (config, http, loginFactory) {

      const root = document.documentElement;
      const cssColors = [
         'main_color',
         'main_color_light',
         'main_color_dark',
         'main_color_contrast_light',
         'main_color_contrast_dark',
         'nav_background',
         'sidebar_background',
         'header_background',
         'invalid',
         'valid',
         'untouched',
         'midwhite',
         'darkwhite',
         'lightgrey',
         'midgrey',
         'grey',
         'darkgrey',
         'green',
         'darkgreen',
         'blue',
         'darkblue',
         'red',
         'darkred',
         'yellow',
         'darkyellow'
      ];
      var Services = {
         getAppLogos: _getAppLogos, // get the curstomerdefined logos of the app
         setAppColors: _setAppColors // get the curstomerdefined logos of the app
      };


      function _getAppLogos (callback) {
         getAppLayout(function (appLayout) {
            appLayout = appLayout || {};
            if (appLayout.logos) {
               callback(appLayout.logos);
            } else {
               callback({});
            }
         });
      }


      function _setAppColors () {
         var appLayout = {};

         // appLayout.colors = { // SAMPLE => REMOVE AFTER COMPLETED CODE
         //    grey: 'black'
         // };

         if (appLayout.colors) {
            for (var i = 0; i < cssColors.length; i++) {
               if (appLayout.colors[cssColors[i]]) root.style.setProperty('--' + cssColors[i], appLayout.colors[cssColors[i]]);
            }
         }
      }


      function getAppLayout (callback) {
         var settings = {};

         if (config && config.app && config.app.name && config.appSettings && config.appSettings[config.app.name]) {
            settings = config.appSettings[config.app.name];
            callback(settings);
         } else {
            http.post('get-app-layout', function (settings) {
               settings = settings || {};
               callback(settings);
            });
         }
      }


      return Services;
   }
]);
