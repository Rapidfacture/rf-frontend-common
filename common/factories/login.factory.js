/**
 * @module loginFactory
 * @desc
 * connect to rf-app-login: login / logout
 * store token, account data, settings, rights etc.
 *
 * @event loggedIn
 * @event loggedOut
 *
 * @version 0.4.0
 */

/* globals rfTokenFactory */

app.factory('loginFactory', ['$rootScope', 'config', '$http', '$state', '$window', '$location', '$q',
   function ($rootScope, config, $http, $state, $window, $location, $q) {

      // var config = {
      /* ---- basic infos ---- */
      // app configuration
      // loginUrl
      // loginMainUrl
      // privacyPolicyLink

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
         getUserFullName: function () {
            return _getUserAttribute('firstName') + ' ' + _getUserAttribute('lastName');
         },
         getUserId: function () {
            return _getUserAttribute('_id');
         },
         getSenderMailAddress: function () {
            return _getUserAttribute('alternativeSenderEmail') || _getUserAttribute('email');
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
         getAppName: _getAppName, // get the name of the app
         getAppUrls: _getAppUrls, // getAppUrls('rf-app-login')
         getEnvironmentAttribute: _getEnvironmentAttribute,
         addTokenToUrl: _addTokenToUrl,

         getAppSettings: function () {
            return config.appSettings || {};
         },
         getUserSettings: function () {
            // TODO: maybe filter out and return just current app settings
            return config.userSettings;
         },

         setUserSettings: _setUserSettings
      };


      // TODO: move those functions to rfTokenFactory

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
         });

      }

      function _login () {
         rfTokenFactory.login();
      }

      function _logout () { // Send logout to server and remove session from db
         config.session = {};
         rfTokenFactory.logout();
      }

      function _getLoggedIn () {
         return !!rfTokenFactory.getToken();
      }

      function _getToken () {
         return rfTokenFactory.getToken();
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

      function _getUserData () {
         return config.user || {};
      }

      function _getUserAccount () {
         config.user = config.user || {};
         return config.user.account || {};
      }


      /**
       * Verify the token
       */
      function _verifyToken () {
         return $q(function (resolve, reject) {
            postToLogin('verify', {}, function (err, data) {
               if (err) {
                  console.log('[loginFactory] ', err);
                  reject();
               } else {
                  console.log('[loginFactory] token verified!');
                  resolve();
               }
            });
         });
      }

      /**
       * Retrive a new token with the old one
       */
      function _refreshToken (sessionId) {
         return $q(function (resolve, reject) {
            postToLogin('refresh', {
               app: config.app.name,
               sessionId: sessionId || null // optional add a sessionId to refresh to find old sessions with already refreshed tokens
            }, function (err, res) {
               if (err) {
                  $rootScope.$broadcast('tokenrefreshed');
                  console.log('[loginFactory] Token refresh failed: ', err);
                  // Break infinite login loop
                  if (('' + err).indexOf('No session ID') !== -1) {
                     // Token set but no session
                     _clearLoginData();
                  } else {
                     setTimeout(function () {
                        _refreshToken(sessionId);
                     }, 3000);
                  }
                  reject();
               } else {
                  console.log('[loginFactory] Token refreshed!');
                  config.token = res.token;
                  rfTokenFactory.refreshConfig(config, function () {
                     $rootScope.$broadcast('tokenrefreshed', res.token);
                     resolve(res.token);
                  });
               }
            });
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
         access = access || 'read';
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

      function _getAppName () {
         var appName = config.app.name;
         return (appName);
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

      function _getEnvironmentAttribute (attribute) {
         return config.environment[attribute];
      }

      function _addTokenToUrl (url) {
         if (!url) return;

         // try to add '#' for angular to prevent router "unmatched redirect"
         if (url[url.length - 1] !== '/') url += '/';
         if (url.search('#') === -1) url += '#/';

         return url + '?token=' + config.token;
      }

      /* -------------  settings  -------------- */

      // todo. Function can be removed (currently not used in erp and cad project)
      function _setUserSettings (userSettings, callback) {
         if (!userSettings) {
            return console.log('[loginFactory] cannot set user settings, incomplete function parameters!');
         }
         postToLogin('settings/app/user', {
            name: config.app.name,
            settings: userSettings
         }, callback);
      }

      /* ------------- helper functions --------------- */

      function postToLogin (url, data, callback) {
         var options = {};

         if (config.token) { // If a token is available set it on every request
            options.headers = {
               'x-access-token': config.token
            };
         }

         $http.post(config.loginMainUrl + '/api/post-' + url, {
            data: data
         }, options)
            // {data: data} - always parse as json, prevent body-parser errors in node backend
            .success(function (response) {
               console.log('successfull posted to /' + url);
               callback(null, response);
            })
            .error(function (err, status, headers, config) {
               console.log('%c http error on url:' + url + ', status ' + status, 'background: red; color: white');
               callback(err, status, headers, config);
            });
      }

      return Services;
   }
]);
