/** rfTokenFactory
 * @desc used in loginfactory and bootstrap
 * do not use in html: ng-app="app" (this would also bootstrap the app)
 * @version 0.2.0
 */

/* globals initTokenFactory */
/* eslint no-unused-vars: "off" */

function initTokenFactory () {

   var service = {
      login: function () {
         if (service.hasLogin()) {
            window.location.href = '#/login';
         } else {
            window.location.href = this.getLoginAppUrl('login', 'redirect', 'app=' + this.config.app.name);
         }
      },

      logout: function () {
         if (service.hasLogin()) {
            window.location.href = '#/logout';
         } else {
            window.location.href = this.getLoginAppUrl('logout', false);
         }
      },

      config: {},

      refreshConfig: function (baseConfig, callback, preventLoggin) {
         var query = {data: ''};
         var urlToken = service.hasUrlToken();
         query.token = urlToken || window.localStorage.token || (baseConfig && baseConfig.token ? baseConfig.token : '');


         var initInjector = angular.injector(['ng']);
         var $http = initInjector.get('$http');


         $http
            .post(baseConfig.serverURL + 'basic-config', query)
            .success(function (response) {

               // transfer keys, but leave old ones
               for (var key in response) {
                  baseConfig[key] = response[key];
               }

               // store obj for internal use in service
               service.config = baseConfig;

               // login app: store the token
               if (service.hasLogin() && service.config.token) {
                  service.storeToken(service.config.token);

               // other apps
               } else {

                  // remove a url token if there is one
                  if (urlToken) {
                     setTimeout(function () { // prevent interference with ui router (wait till url is set to prevent loops)
                        service.removeTokenFromUrl();
                     }, 500);
                  }
               }

               if (preventLoggin || urlToken || service.isInternal() || (baseConfig && baseConfig.token) || service.hasLogin()) {
                  if (callback) callback(baseConfig);
               } else {
                  service.login();
               }
            })
            .error(function (response) { // err function

               // on any error (except "no session found" - this will still return basicConfig) we will do a logout
               if (response.err) {
                  console.log('[service] error:', response.err);
                  // on error => still copy keys to config to provide the logout url
                  for (var key in response) {
                     service.config[key] = response[key];
                  }
                  service.deleteToken();
                  service.logout();
                  setTimeout(function () {
                     window.location.reload();
                  }, 500);
               } else if (callback) { // rf-acl not present => bootstrap without login
                  callback(response);
               }
            });
      },


      getToken: function () {
         if (
            (!window.localStorage.token || ['null', 'false', 'undefined'].indexOf(window.localStorage.token) !== -1) &&
            (!service.config || !service.config.token)
         ) {
            return false;

         } else {
            return window.localStorage.token || (this.config && this.config.token ? this.config.token : '');
         }
      },

      storeToken: function (token) {
         window.localStorage.token = token;
      },

      deleteToken: function () {
         delete this.config.token;
         window.localStorage.removeItem('token');
      },

      hasUrlToken: function () {
         return this.getUrlParameter('token');
      },

      isInternal: function () {
         return this.getUrlParameter('internal') === 'ksdf6s80fsa9s0madf7s9df';
      },

      hasLogin: function () {
         return this.config.hasLogin;
      },

      getLoginAppUrl: function (page, redirect, param) {
         var url = this.config.loginMainUrl + '/#/' + page;
         if (redirect) {
            var newUrl = window.location.href.split('?')[0]; // cut away old query parameter
            // Fix for non ui-router routes redirect
            if (!window.location.hash) {
               newUrl = window.location.origin + '/#/';
            }
            url += '?redirect_uri=' + encodeURIComponent(newUrl) +
                 ((param) ? ('&' + param) : '');
         }

         return url;
      },

      getUrlParameter: function (key) {
         var href = window.location.href,
            uri = '',
            value = false,
            params;

         // Cut ? from uri
         if (href.indexOf('?') >= 0) {
            uri = href.split('?')[1];
         }

         // Find required param
         params = uri.split('&');
         for (var p in params) {
            var keyValue = params[p].split('=');
            if (keyValue[0] === key) {
               value = keyValue[1];
               break;
            }
         }

         return value;
      },

      removeTokenFromUrl: function () {
         var href = window.location.href;
         // Regex is: ([\?\&])token=[^\?\&]*([\?\&]|$) but eslint needs unicodes because of bad escaping error
         var re = new RegExp('([\u003F\u0026])token=[^\u003F\u0026]*([\u003F\u0026]|$)');

         // Replace the token in the url but keep the next or previous parameters
         href = href.replace(re, function (match, p1, p2) {
            if (p2) return p1;
            return '';
         });

         window.location.href = href;
      }
   };

   return service;
}
