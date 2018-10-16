/**
 * @module loginFactory
 * @desc
 * connect to rf-app-login: login / logout
 * store token, account data, settings, rights etc.
 *
 * @event loggedIn
 * @event loggedOut
 *
 * @version 0.2.2
 */

/* globals rfTokenFactory */

app.factory('loginFactory', ['$rootScope', 'config', '$http', '$state', '$window', '$location', '$q',
   function ($rootScope, config, $http, $state, $window, $location, $q) {

      // var config = {
      /* ---- basic infos ---- */
      // app configuration
      // loginUrl
      // loginMainUrl
      // termsAndPolicyLink

      /* ---- from session db ---- */
      // token => small token for refreshing
      // user
      // user.account
      // userGroups
      // language
      // rights
      // isloginAdmin => only for loginMenu

      /* ---- from session settings dbs ---- */
      // globalSettings
      // appSettings
      // userSettings
      // };


      var refreshRunning = false;

      var Services = {

         // login
         run: _run,
         initAndRefreshOnLogin: _initAndRefreshOnLogin,
         login: _login,
         logout: _logout,


         getLoggedIn: _getLoggedIn,

         // user data
         getUserData: _getUserData,
         getUserAccount: _getUserAccount,

         // user data
         getUserName: function () {
            return _getUserAttribute('email');
         },
         getUserId: function () {
            return _getUserAttribute('_id');
         },

         getToken: _getToken,
         verifyToken: _verifyToken,
         refreshToken: _refreshToken,

         getLanguage: function () {
            return config.language || 'en';
         },

         // rights
         hasRight: _hasRight, // hasRight('accounting', "write") or hasRight('accounting', "write", "own")
         hasAppRight: _hasAppRight, // hasAppRight('rf-app-cad', 'drawings', "write")

         hasUserGroup: function (userGroup) {
            return config.userGroups.indexOf(userGroup) !== -1;
         },
         isLoginAdmin: function () {
            return config.isLoginAdmin || false;
         },

         // settings
         getGlobalSettings: function () {
            return config.globalSettings || {};
         },

         // global  app settings
         hasApp: _hasApp, // hasApp('rf-app-login')
         getAppUrls: _getAppUrls, // getAppUrls('rf-app-login')
         addTokenToUrl: _addTokenToUrl,

         getAppSettings: function () {
            // If config.app.name settings not set return the whole appSettings
            // for backwards compatibility
            var appSettings = config.appSettings || {};
            return (
               appSettings.hasOwnProperty(config.app.name)
                  ? appSettings[config.app.name]
                  : appSettings);
         },
         getUserSettings: function () {
            // TODO: maybe filter out and return just current app settings
            return config.userSettings;
         },

         setUserSettings: _setUserSettings
      };

      function _run (token) {
         token = token || $location.search().token;

         // If no token is presented and skipLoginCheck is false then redirect to login page
         if (!token && !rfTokenFactory.isInternal()) {
            _clearLoginData(); // Safety clear the loginData if no token is presented and broadcast a loggedOut event to remove old data
            rfTokenFactory.login();
            return;
         }
         rfTokenFactory.refreshConfig(config, function () {
            $rootScope.$broadcast('loggedIn'); // give http or ws factory the signal to fetch the new token
            _removeTokenFromUrl();
         });

      }

      function _login () {
         rfTokenFactory.login();
      }

      /**
       * Redirect user to logout page
      */
      function _logout () { // Send logout to server and remove session from db
         config.session = {};
         rfTokenFactory.logout();
      }

      function _getLoggedIn () {
         return !!rfTokenFactory.getToken();
      }

      /**
       * Call a refresh function if login data changes
      * This is needed for directive refresh
      * @param {*} callback
      */
      function _initAndRefreshOnLogin (callback) {
         callback(config, _getLoggedIn());
         $rootScope.$on('loggedIn', function () {
            callback(config, _getLoggedIn());
         });
         $rootScope.$on('loggedOut', function () {
            callback(config, _getLoggedIn());
         });
      }

      /* -------------  login data  -------------- */

      function _getToken () {
         return rfTokenFactory.getToken();
      }

      function _getUserData () {
         return config.user || {};
      }

      function _getUserAccount () {
         return config.user.account || {};
      }


      /**
       * Verify the token
      */
      function _verifyToken () {
         return $q(function (resolve, reject) {
            postToLogin('verify', {}, {}).then(function (data) {
               console.log('[loginFactory] token verified!');
               resolve();
            }, function (err) {
               console.log('[loginFactory] ', err);
               reject();
            });
         });
      }

      /**
       * Retrive a new token with the old one
      */
      function _refreshToken (sessionId) {
         return $q(function (resolve, reject) {
            if (!refreshRunning) { // If there is already a refresh running then wait for it
               refreshRunning = true;
               postToLogin('refresh', {
                  app: config.app.name,
                  sessionId: sessionId || null // optional add a sessionId to refresh to find old sessions with already refreshed tokens
               }, {}).then(function (res) {
                  console.log('[loginFactory] Token refreshed!');
                  config.token = res.token;
                  rfTokenFactory.refreshConfig(config, function () {
                     refreshRunning = false;
                     $rootScope.$broadcast('tokenrefreshed', res.token);
                     resolve(res.token);
                  });
               }, function (err) {
                  refreshRunning = false;
                  $rootScope.$broadcast('tokenrefreshed');
                  console.log('[loginFactory] Token refresh failed: ', err);
                  // Break infinite login loop
                  if (('' + err).indexOf('No session ID') !== -1) {
                     // Token set but no session
                     _clearLoginData();
                     _removeTokenFromUrl();
                  }
                  reject();
               });
            } else {
               console.log('[loginFactory] Refresh is running ...');
               var listener = $rootScope.$on('tokenrefreshed', function (token) {
                  console.log('[loginFactory] tokenrefreshed event fired!');
                  listener(); // Unsubscribe listener
                  resolve(token); // and resolve promise to re-request
               });
            }
         });
      }

      function _clearLoginData () {

         // remove all keys from config, except serverURLs
         for (var key in config) {
            if (key !== 'wsUrl' && key !== 'serverURL') {
               delete config[key];
            }
         }

         $rootScope.$broadcast('loggedOut');
      }

      function _getUserAttribute (attribute) {
         return (config.user && config.user[attribute]) ? config.user[attribute] : '';
      }

      function _hasAppRight (app, section, access, range) {
         if (config.rights && config.rights[app] &&
          config.rights[app][section] &&
          config.rights[app][section][access]) {

            // range (all, own) specified => check if included
            if (range) {
               return (config.rights[app][section][access].indexOf(range) !== -1);

            // no range => return all
            } else {
               return config.rights[app][section][access];
            }
         } else {
            return false;
         }
      }

      function _hasRight (section, access, range) {
         // example: hasRight('accounting', "write")
         // example: hasRight('accounting', "write", "all")
         return _hasAppRight(config.app.name, section, access, range);
      }

      function _hasApp (app) {
         return (config.rights && config.rights[app]);
      }

      function _getAppUrls (app) {
         var urls = {};
         if (config.globalSettings && config.globalSettings.apps &&
            config.globalSettings.apps[app] && config.globalSettings.apps[app].urls) {
            urls = config.globalSettings.apps[app].urls;
         }
         return urls;
      }

      function _addTokenToUrl (url) {
         if (!url) return;

         // try to add '#' for angular to prevent router "unmatched redirect"
         if (url[url.length - 1] !== '/') url += '/';
         if (url.search('#') === -1) url += '#/';

         return url + '?token=' + config.token;
      }

      /**
       * Redirect without token parameter in the url
      */
      function _removeTokenFromUrl () {
         rfTokenFactory.removeTokenFromUrl();
      }

      /* -------------  settings  -------------- */

      function _setUserSettings (userSettings, callback) {
         if (!userSettings) {
            return console.log('[loginFactory] cannot set user settings, incomplete function parameters!');
         }
         postToLogin('settings/app/user', {
            name: config.app.name,
            settings: userSettings
         }, {})
            .then(function (settings) {
               if (callback) callback(settings);
            }, function (err) {
               console.log(err);
            });
      }

      /* ------------- helper functions --------------- */

      function postToLogin (subUrl, data, options) {
         return $q(function (resolve, reject) {
            var url = config.loginMainUrl + '/' + subUrl;
            options = options || {};

            if (config.token) { // If a token is available set it on every request
               options['x-access-token'] = config.token;
            }

            $http.post(url, {
               data: data
            }, options)
            // {data: data} - always parse as json, prevent body-parser errors in node backend
               .success(function (response) {
                  console.log('successfull posted to /' + url);
                  resolve(response);
               })
               .error(function (err, status, headers, config) {
                  console.log('%c http error on url:' + url + ', status ' + status, 'background: red; color: white');
                  reject(err, status, headers, config);
               });
         });
      }

      return Services;
   }
]);
