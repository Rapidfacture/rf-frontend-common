/**
 * @module http factory
 * @desc backend middleware with methods get and post, error handling included
 * @version 0.1.3
 */

// Source: https://stackoverflow.com/a/901144/2597135
function getQueryParameterByName (name, url) {
   if (!url) url = window.location.href;
   name = name.replace(/[[\]]/g, '\\$&');
   var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
   if (!results) return null;
   if (!results[2]) return '';
   return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


app.factory('http', ['$http', 'config', '$rootScope', 'loginFactory', '$q', function ($http, config, $rootScope, loginFactory, $q) {
   var debugMode = false;

   function errorFunction (data, status, headers, conf, errFunc, url) {
      console.log('%c http error on url:' + config.serverURL + url + ', status ' + status, 'background: red; color: white');
      console.log(data);
      if (errFunc) errFunc(data, status, headers, conf);
      if (debugMode) {
         $rootScope.$broadcast('note_alert',
            'error posting to: ' + url + ', returned data ' + data + ', status ' + status);
      }
   }


   function successFunction (type, url, successFunc, response, requestId) {
      console.log('successfull ' + type + ' to /' + url);
      if (successFunc) successFunc(response, requestId);
   }

   function _setHeaderToken (token) {
      if (token) {
         console.log('[http] token set');
         $http.defaults.headers.common['x-access-token'] = token;
      } else {
         console.log('[http] token unset');
         delete $http.defaults.headers.common['x-access-token'];
      }
   }

   // acl: set headers, when token present after login
   $rootScope.$on('loggedIn', function (event, token) {
      _setHeaderToken(token);
   });

   // unset headers after logout
   $rootScope.$on('loggedOut', function (event) {
      _setHeaderToken(null);
   });

   return {

      retryCount: 0,

      post: function (url, data, successFunc, errFunc) {
         var self = this;
         // post without data argument
         if (typeof data === 'function' && !successFunc && !errFunc) {
            successFunc = data;
            errFunc = successFunc;
            data = {};
         }
         data = data || {};
         var requestId = data.requestId || '';

         $http.post(config.serverURL + url, {data: data})
         // {data: data} - always parse as json, prevent body-parser errors in node backend
            .success(function (response) {
               self.retryCount = 0; // Reset retry count on every request, ToDo: Maybe this is a problem if you make multiple invalid requests in a row
               successFunction('POST', url, successFunc, response, requestId);
            })
            .error(function (data, status, headers, config) {
               self.handleErrorResponse(data, status, headers, config)
                  .then(function () {
                     self.post(url, data, successFunc, errFunc);
                  })
                  .catch(function (e) {
                     if (e.message === 'login') {
                        loginFactory.login();
                     } else {
                        errorFunction(data, status, headers, config, errFunc, url);
                     }
                  });
            });
      },

      get: function (url, data, successFunc, errFunc) {
         var self = this;

         data = data || null;
         // call without data, maximum tree arguments => skip parameter "data"
         if (typeof data === 'function') {
            if (successFunc) errFunc = successFunc;
            successFunc = data;
            data = null;
         }

         var requestId = (data && data.requestId) ? data.requestId : '';

         var dataQueryPart = (data ? '?data=' + encodeURIComponent(JSON.stringify(data)) : '');
         // Internal / magic token processor
         // Used for internal requests
         var internalToken = getQueryParameterByName('internal');
         var internalQueryPart = '';
         if (internalToken) {
            internalQueryPart = (dataQueryPart ? '&' : '?') + 'internal=' + internalToken;
         }

         $http.get(config.serverURL + url + dataQueryPart + internalQueryPart)
            .success(function (response) {
               self.retryCount = 0; // Reset retry count on every request, ToDo: Maybe this is a problem if you make multiple invalid requests in a row
               successFunction('GET', url, successFunc, response, requestId);
            })
            .error(function (data, status, headers, config) {
               self.handleErrorResponse(data, status, headers, config)
                  .then(function () {
                     self.get(url, data, successFunc, errFunc);
                  })
                  .catch(function (e) {
                     if (e.message === 'login') {
                        loginFactory.login();
                     } else {
                        errorFunction(data, status, headers, config, errFunc, url);
                     }
                  });
            });
      },

      mail: function (url, data, successFunc, errFunc) {
         $rootScope.$emit('overlay', 'open', 'sendingMail');
         $http.post(config.serverURL + url, {
            data: data
         })
            .success(function (response) {
               $rootScope.$emit('overlay', 'close');
               $rootScope.$emit('note_info', 'mailSent');
               successFunction('POST', url, successFunc, response);
            })
            .error(function (data, status, headers, config) {
               $rootScope.$emit('overlay', 'close');
               $rootScope.$emit('note_error', 'couldNotSendMail');
               errorFunction(data, status, headers, config, errFunc, url);
            });
      },

      fileSave: function (url, data, successFunc, errFunc) {
         var headers = data.headers || {};
         headers['Content-type'] = 'application/octet-stream';
         headers.preview = (data.mimetype === 'application/pdf') ? 'true' : 'false';
         $http({
            method: 'POST',
            url: config.serverURL + url,
            data: data.content,
            headers: headers,
            transformRequest: []
         })
            .success(function (response) {
               successFunction('PUT', url, successFunc, response);
            })
            .error(function (data, status, headers, config) {
               errorFunction(data, status, headers, config, errFunc, url);
            });
      },

      fileDownload: function (url, data, successFunc, errFunc) {
         $http({
            method: 'POST',
            url: config.serverURL + 'drawingbinary',
            data: {data: data},
            responseType: 'arraybuffer'
         })
            .success(function (response) {
               successFunction('PUT', url, successFunc, response);
            })
            .error(function (data, status, headers, config) {
               errorFunction(data, status, headers, config, errFunc, url);
            });
      },

      setHeaderToken: _setHeaderToken,

      handleErrorResponse: function (data, status, headers, config) {
         var self = this;
         return $q(function (resolve, reject) {
            if (status === 401 && $http.defaults.headers.common['x-access-token']) { // if 401 and a token was presented then its exired
               if (self.retryCount <= 3) { // Retry refresh token
                  console.log('Token expired! Try refresh');
                  self.retryCount++; // Increment retry counter
                  loginFactory.refreshToken().then(function () {
                     // If verify or refresh was successfull then try again to request
                     resolve();
                  }).catch(function () {
                     // Token could not be refreshed
                     reject(new Error('login'));
                  });
               } else {
                  // Token could not be refreshed
                  reject(new Error('login'));
               }
            } else if (status === 401 && data === 'No session found!') {
               console.log('No Session found - Logout');
               loginFactory.logout();
            } else {
               // There was an error response for the request
               reject(new Error('error'));
            }
         });
      }
   };
}]);
