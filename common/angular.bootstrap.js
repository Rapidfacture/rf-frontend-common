// this file holds rfTokenFactory and angular bootstrap
// NOTE: both need to be in this file to ensure correct startup order


/** rfTokenFactory
 * @desc used in loginfactory and bootstrap
 * do not use in html: ng-app="app" (this would also bootstrap the app)
 * @version 0.1.4
 */
var rfTokenFactory = {

   login: function () {
      window.location.href = this.getLoginAppUrl('login', 'redirect', 'app=' + this.config.app.name);
   },

   logout: function () {
      window.location.href = this.getLoginAppUrl('logout', false);
   },

   config: {},

   refreshConfig: function (baseConfig, callback) {

      // console.log('refreshConfig');
      // console.log('baseConfig', baseConfig);

      var query = {data: ''};
      var urlToken = rfTokenFactory.hasUrlToken();
      query.token = urlToken || window.localStorage.token || (baseConfig && baseConfig.token ? baseConfig.token : '');


      var initInjector = angular.injector(['ng']),
         $http = initInjector.get('$http');

      console.log('query', query);

      $http.post(baseConfig.serverURL + 'basic-config', query)
         .success(function (response) {

            // transfer keys, but leave old ones
            for (var key in response) {
               baseConfig[key] = response[key];
            }

            // store obj for internal use in rfTokenFactory
            rfTokenFactory.config = baseConfig;

            // login app: store the token
            if (rfTokenFactory.isLoginApp() && rfTokenFactory.config.token) {
               rfTokenFactory.storeToken(rfTokenFactory.config.token);

            // other apps: delete token if there has one been saved by accident
            } else {
               rfTokenFactory.deleteStorageToken();

               // remove a url token if there is one
               if (urlToken) {
                  setTimeout(function () { // prevent interference with ui router (wait till url is set to prevent loops)
                     rfTokenFactory.removeTokenFromUrl();
                  }, 500);
               }
            }

            // console.log('got everything', rfTokenFactory.config );

            if (urlToken || rfTokenFactory.isInternal() || rfTokenFactory.isLoginApp()) {
               if (callback) callback(baseConfig);

            } else {
               rfTokenFactory.login();
            }
         })
         // could not post
         .error(function (baseConfig) { // err function

            // on any error (except "no session found" - this will still return basicConfig) we will do a logout
            if (baseConfig.err) {
               console.log('[rfTokenFactory] error:', baseConfig.err);
               rfTokenFactory.logout();
            } else if (callback) { // rf-acl not present => bootstrap without login
               callback(baseConfig);
            }
         });
   },


   getToken: function () {
      if (
         (!window.localStorage.token ||
         (typeof window.localStorage.token === 'string' &&
         (window.localStorage.token === 'null' || window.localStorage.token === 'false' || window.localStorage.token === 'undefined'))) &&
         (!rfTokenFactory.config || !rfTokenFactory.config.token)
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

   deleteStorageToken: function () {
      window.localStorage.removeItem('token');
   },

   hasUrlToken: function () {
      return this.getUrlParameter('token');
   },

   isInternal: function () {
      return this.getUrlParameter('internal') === 'ksdf6s80fsa9s0madf7s9df';
   },

   isLoginApp: function () {
      // console.log(this.config);
      // For dev replace localhost always by ip
      var origin = window.location.origin.replace('localhost', '127.0.0.1'),
         // For dev replace localhost always by ip
         loginUri = this.config.loginMainUrl.replace('localhost', '127.0.0.1');

      return (origin === loginUri);
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

   removeTokenFromUrl () {
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


/**
 * @desc bootstrap angular application
 * do not use in html: ng-app="app" (this would also bootstrap the app)
 * @version 0.1.1
 */
function startAngularApp () {
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

   rfTokenFactory.refreshConfig(baseConfig, bootstrapApplication);


   function bootstrapApplication (baseConfig) {
      app.constant('config', baseConfig);
      angular.element(document).ready(function () {
         angular.bootstrap(document, ['app']);
      });
   }
}

startAngularApp();
