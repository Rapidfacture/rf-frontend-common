/**
 * @module layoutFactory
 * @desc
 * individualise colors, logos
 *
 * @version 0.1.0
 */

app.factory('layoutFactory', ['config', 'http', 'loginFactory',
   function (config, http, loginFactory) {

      var root = document.documentElement;

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
