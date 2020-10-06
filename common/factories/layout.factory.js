/**
 * @module layoutFactory
 * @desc
 * individualise colors, logos
 *
 * @version 0.1.1
 */

app.factory('layoutFactory', ['config', 'http',
   function (config, http) {

      var root = document.documentElement;

      var Services = {
         getAppLogos: _getAppLogos, // get the curstomerdefined logos of the app
         setAppColors: _setAppColors, // get the curstomerdefined logos of the app
         getAppTabName: _getAppTabName
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

      function _getAppTabName (callback) {
         getAppLayout(function (appLayout) {
            appLayout = appLayout || {};

            callback(appLayout.tabName);
         });
      }

      function _setAppColors () {
         getAppLayout(function (appLayout) {
            appLayout = appLayout || {};

            if (appLayout.colors && appLayout.colors !== {}) {
               for (var color in appLayout.colors) {
                  if (appLayout.colors[color]) root.style.setProperty('--' + color, appLayout.colors[color]);
               }
            }
         });
      }


      function getAppLayout (callback) {
         http.post('get-app-layout', function (settings) {
            settings = settings || {};
            callback(settings);
         });
      }


      return Services;
   }
]);
