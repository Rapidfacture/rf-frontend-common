/**
 * @module http factory
 * @desc backend middleware with methods get and post, error handling included
 * @version 0.2.6
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


app.factory('http', function (
   $http,
   config,
   $rootScope,
   loginFactory,
   $q
) {
   var debugMode = false;

   function errorFunction (data, status, headers, conf, errFunc, url) {
      console.log('%c http error on url:' + url + ', status ' + status, 'background: red; color: white');
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

   function _getUrl (url) {
      var apiPrefix = 'api';

      if (url.startsWith('http')) {
         console.log('WARNING: your url is not relative: ', url);
      }

      if (url[0] !== '/') url = '/' + url;

      if (url.startsWith('/' + apiPrefix)) {
         console.log('WARNING: your url for some reason already holds the apiPrefix', apiPrefix, url);
      }

      return config.serverURL + apiPrefix + url;
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

      getUrl: _getUrl,

      post: function (url, data, successFunc, errFunc) {
         var self = this;
         url = _getUrl('post-' + url);

         // post without data argument
         if (typeof data === 'function' && !successFunc && !errFunc) {
            successFunc = data;
            errFunc = successFunc;
            data = {};
         }
         data = data || {};
         var requestId = data.requestId || '';

         // Internal / magic token processor
         // Used for internal requests
         var internalToken = getQueryParameterByName('internal');
         var internalQueryPart = (internalToken ? '?internal=' + internalToken : '');

         $http.post(url + internalQueryPart, {data: data})
         // {data: data} - always parse as json, prevent body-parser errors in node backend
            .success(function (response) {
               self.retryCount = 0; // Reset retry count on every request, ToDo: Maybe this is a problem if you make multiple invalid requests in a row
               successFunction('POST', url, successFunc, response, requestId);
            })
            .error(function (data, status, headers, conf) {
               self.handleErrorResponse(data, status, headers, conf)
                  .then(function () {
                     self.post(url, data, successFunc, errFunc);
                  })
                  .catch(function (e) {
                     if (e.message === 'login') {
                        loginFactory.login();
                     } else {
                        errorFunction(data, status, headers, conf, errFunc, url);
                     }
                  });
            });
      },

      get: function (url, data, successFunc, errFunc) {
         var self = this;
         url = _getUrl('get-' + url);

         data = data || null;
         // call without data, maximum tree arguments => skip parameter "data"
         if (typeof data === 'function') {
            if (successFunc) errFunc = successFunc;
            successFunc = data;
            data = null;
         }

         var requestId = (data && data.requestId) ? data.requestId : '';

         // Internal / magic token processor
         // Used for internal requests
         var internalToken = getQueryParameterByName('internal');
         var internalQueryPart = (internalToken ? '?internal=' + internalToken : '');

         var runningRequest = $http.post(url + internalQueryPart, {data: data})
            .success(function (response) {
               self.retryCount = 0; // Reset retry count on every request, ToDo: Maybe this is a problem if you make multiple invalid requests in a row
               successFunction('GET', url, successFunc, response, requestId);
            })
            .error(function (data, status, headers, conf) {
               self.handleErrorResponse(data, status, headers, conf)
                  .then(function () {
                     self.get(url, data, successFunc, errFunc);
                  })
                  .catch(function (e) {
                     if (e.message === 'login') {
                        loginFactory.login();
                     } else {
                        errorFunction(data, status, headers, conf, errFunc, url);
                     }
                  });
            });

         return {
            then: function (callback) {
               runningRequest.then(function (response) {
                  callback(response.data, requestId);
               });
            },
            success: function (callback) {
               runningRequest.success(function (response) {
                  callback(response.data, requestId);
               });
            },
            error: function (callback) {
               runningRequest.error(function (data, status, headers, conf) {
                  callback(data, status, headers, conf);
               });
            }
         };
      },

      mail: function (url, data, successFunc, errFunc) {
         $rootScope.$emit('overlay', 'open', 'sendingMail');
         url = _getUrl('post-' + url);
         $http.post(url, {
            data: data
         })
            .success(function (response) {
               $rootScope.$emit('overlay', 'close');
               $rootScope.$emit('note_info', 'mailSent');
               successFunction('POST', url, successFunc, response);
            })
            .error(function (data, status, headers, conf) {
               $rootScope.$emit('overlay', 'close');
               $rootScope.$emit('note_error', 'couldNotSendMail');
               errorFunction(data, status, headers, conf, errFunc, url);
            });
      },

      fileSave: function (url, data, successFunc, errFunc) {
         $rootScope.$broadcast('file-upload-start');
         var headers = data.headers || {};
         url = _getUrl('post-' + url);
         headers['Content-type'] = 'application/octet-stream';
         $http({
            method: 'POST',
            url: url,
            data: data.content,
            headers: headers,
            transformRequest: [],
            uploadEventHandlers: {
               progress: function (evt) {
                  var percentComplete = Math.round(100 / evt.total * evt.loaded);
                  $rootScope.$broadcast('file-upload-progress', percentComplete);
               }
            }
         })
            .success(function (response) {
               $rootScope.$broadcast('file-upload-finish');
               successFunction('POST', url, successFunc, response);
            })
            .error(function (data, status, headers, conf) {
               $rootScope.$broadcast('file-upload-finish');
               errorFunction(data, status, headers, conf, errFunc, url);
            });
      },


      setHeaderToken: _setHeaderToken,

      handleErrorResponse: function (data, status, headers, conf) {
         var self = this;
         return $q(function (resolve, reject) {
            if ((status === 401 || status === 403) && $http.defaults.headers.common['x-access-token']) { // if 401 and a token was presented then its exired
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
});
