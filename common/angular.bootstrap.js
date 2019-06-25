/**
 * @desc bootstrap angular application
 * do not use in html: ng-app="app" (this would also bootstrap the app)
 * @version 0.1.3
 *
 * How to integrate in your app
 * @example without acl
 *   startAngularApp(null, true);
 *
 * @example standard: app with login and acl
 *   startAngularApp();
 */


/* globals rfTokenFactory, initTokenFactory */
/* eslint no-unused-vars: "off" */
/* eslint no-global-assign: "off" */

function startAngularApp (preventLoggin, noACL) {

   var origin = window.location.origin;

   if (!origin) { // IE 11 and below
      origin = window.location.protocol + '//' + window.location.hostname;
   }

   var servURL = origin + window.location.pathname;
   if (servURL.charAt(servURL.length - 1) !== '/') {
      servURL += '/';
   }

   var baseConfig = {
      'serverURL': servURL,
      'wsUrl': servURL.replace('http', 'ws')
   };

   // we always fetch the login url from backend to prevent errors, when the url changes

   if (noACL) {
      bootstrapApplication(baseConfig);
   } else {
      rfTokenFactory = initTokenFactory();
      rfTokenFactory.refreshConfig(baseConfig, bootstrapApplication, preventLoggin);
   }


   function bootstrapApplication (baseConfig) {
      app.constant('config', baseConfig);
      angular.element(document).ready(function () {
         angular.bootstrap(document, ['app']);
      });
   }
}

// startAngularApp(null, true);
