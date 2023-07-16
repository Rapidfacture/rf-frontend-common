/**
 * @module wsConnectionFactory
 * @version 0.1.9
 * @desc
 * * angular factory for websocket client/server communication, asynchron request
 * * init connection
 * * reconnect on errors, connection timeout
 * * log incoming/outgoing messages
 * * reuest are stored and a promise is given back; it is resolved, when the backend answer arrives
 * * pending requests (several backend answers for one request) or backend message without request: broadcast over rootScope
 * * all services for the app are listed in wsFactory
 *
 * rootScope events:
 * @event wsConnectionOpen
 * @event noServerConnectionConnectAgaian
 * @event websocketMessage request is pending or no callbackId found
 * @event AuthenticateFailed
 * listen to event "loggedIn"
 * listen to event "loggedOut"
 *
 *
 * Code based on:
 * * http://clintberry.com/2013/angular-js-websocket-service/ and
 * * http://stackoverflow.com/questions/22431751/websocket-how-to-automatically-reconnect-after-it-dies
 */

app.factory('wsConnectionFactory', function ($q, $rootScope, $window, loginFactory) {

   var Services = {
      initConnection: _initConnection,
      sendWSMessageAndGetResponsePromise: _sendWSMessageAndGetResponsePromise,
      getWsConnectionOpen: function () {
         return wsConnectionOpen;
      }
   };

   // keep pending requests until responses arrives
   var callbacks = {};
   // unique callback ID to map requests to responses
   var currentCallbackId = 0;
   // websocket object with address to the websocket
   var ws;

   var serverURL;

   var wsConnectionOpen = false;

   // connection timeout check
   var defaultConnectionTimeout = 5, // seconds
      firstFailure = true; // reject packges after second error => prevent to many error messages

   // stay alive signal; needed to prevent firewalls cutting of the line after certain time
   var keepConIntervalTime = 20, // seconds
      keepConInterval;


   /* --------------------------------------- Establish Websocket Connection ---------------------------------------- */

   function _initConnection (url, opts) { // init websocket connection
      opts = opts || {};
      if (!url) {
         log('No Server URL specified! Cannot Connect Websocket');
         return;
      }
      defaultConnectionTimeout = opts.defaultConnectionTimeout || defaultConnectionTimeout;
      keepConIntervalTime = opts.keepConIntervalTime || keepConIntervalTime;

      serverURL = url.replace('http', 'ws');

      ws = new WebSocket(serverURL);

      ws.onopen = function () {
         // do not close websocket on first failure
         firstFailure = true; // needed for reject function

         // clear "keep connection alive interval" function when reconnecting => only running once
         if (typeof keepConInterval !== 'undefined') {
            clearInterval(keepConInterval);
         }

         // hold websocket connection open
         keepConInterval = setInterval(function () {
            keepCon();
         }, keepConIntervalTime * 1000);


         sendAllPendingRequests();

         wsConnectionOpen = true;
         log('connected to: ', serverURL);
         $rootScope.$broadcast('wsConnectionOpen');
      };

      ws.onmessage = function (message) {
         try {
            var messageJson = JSON.parse(message.data);
            log('received: ', messageJson);
            if (messageJson.errsrc === 'acl') {
               // Refresh token, then retry request
               console.log('Refreshing login token...');
               loginFactory.refreshToken().then(function () {
                  if (_reSendRequest(messageJson.callbackId)) {
                     log('Token refresh success - retrying request...');
                  } else {
                     console.warn('Request retries exceeded: ', messageJson);
                  }
               }).catch(function (err) {
                  console.error('Failed to refresh token: ', err);
                  console.warn('Will not retry request due to failed token refresh: ', messageJson);
                  $rootScope.$broadcast('WSTokenRefreshFailed');
               });
               return;
            }

            if (callbacks[messageJson.callbackId] && !messageJson.pending) {
               // resolve corresponding callback
               $rootScope.$apply(callbacks[messageJson.callbackId].cb.resolve(messageJson));
               delete callbacks[messageJson.callbackId];
            } else { // peding requests or without callback => global event
               $rootScope.$broadcast('websocketMessage', message);
            }
         } catch (error) {
            log('Error parsing message:' + error);
            log('Original message: ', message);
         }
      };

      ws.onclose = function (e) {
         var reconnectTimeout = 2;
         ws = null;
         if (typeof keepConInterval !== 'undefined') {
            clearInterval(keepConInterval); // clear "keep connection alive interval" function when not connected
         }
         setTimeout(function () {
            log('connection closed, try reconnecting to ', serverURL);
            _initConnection(serverURL);
         }, reconnectTimeout * 1000);
      };

      ws.onerror = function (err) {
         if (typeof keepConInterval !== 'undefined') {
            clearInterval(keepConInterval); // clear "keep connection alive interval" function when not connected
         }
         log('error: ', err.message);
         ws.close();
      };
   }

   var timeoutArray = [];

   function clearAllTimeouts () {
      for (var i = 0; i < timeoutArray.length; i++) {
         clearTimeout(timeoutArray[i]);
      }
   }


   function _sendWSMessageAndGetResponsePromise (func, data, timeout) { // handle Rrquests
      var defer = $q.defer();
      // Use custom or default timeout
      var connectionTimeout = timeout || defaultConnectionTimeout;
      defer._connectionTimeout = connectionTimeout;

      // generate new callback ID for message
      currentCallbackId = (currentCallbackId + 1) % 100000;
      var callbackId = currentCallbackId;
      // reject package, when timeout reached
      timeoutArray.push(setTimeout(function () {
         _reject(defer);
      }, connectionTimeout * 1000));

      // disable closing the connection, when answer arrives before
      defer.promise.then(function () {
         clearAllTimeouts();
      });

      callbacks[callbackId] = {
         time: new Date(),
         cb: defer
      };

      var request = {
         func: func,
         callbackId: callbackId,
         token: loginFactory.getToken(), // might be null or undefined, that's OK(-ish)
         data: data
      };

      callbacks[callbackId].origRequest = request;
      callbacks[callbackId].retriesLeft = 3;
      _sendOrEnqueueRequest(request);

      return defer.promise;
   }

   function _sendOrEnqueueRequest (request) {
      // connection established?  websockt states: CONNECTING  OPEN  CLOSING
      // CLOSED
      if (ws && ws.readyState === ws.OPEN) {
         send(request);
      } else {
         callbacks[request.callbackId].req = request;
      }
   }

   /**
       * Re-send already sent request (with known mapping)
       * return true if sent, false if retries exceeded
       */
   function _reSendRequest (callbackId) {
      // If request is pending already, just wait for it to be sent on reconnect.
      if (callbacks[callbackId].req) {
         return;
      }
      // Check if there is any retry left
      if (callbacks[callbackId].retriesLeft <= 0) {
         return false;
      }
      callbacks[callbackId].retriesLeft--;
      // Set updated token
      callbacks[callbackId].origRequest.token = loginFactory.getToken();
      _sendOrEnqueueRequest(callbacks[callbackId].origRequest);
      return true;
   }

   function _reject (defer) { // called on connection errors
      defer.reject();
      if (ws) {
         if (ws.readyState !== ws.OPEN) { // socket no longer open => reconnect
            _closeWebsocket();
         } else { // state is still open, but connectionTimeout passed; connection might be lost
            if (firstFailure) { // try one more send
               firstFailure = false;
               keepCon();
            } else {
               _closeWebsocket();
            }
         }
      }
      log('package rejected: ' + defer._connectionTimeout + ' seconds no reply from server');
   }

   function _closeWebsocket () {
      wsConnectionOpen = false;
      ws.close(); // intitiate a reconnect
      log('No connection, try to reconnect.');
      $rootScope.$broadcast('noServerConnectionConnectAgaian');
   }

   function sendAllPendingRequests () {
      for (var callbackId in callbacks) {
         var callback = callbacks[callbackId];
         if (callback.req) { // reqest not sent? => try sending now
            send(callback.req);
            delete callback.req;
         }
      }
   }

   function send (req) {
      log('sent: ', req);
      ws.send(JSON.stringify(req));
   }

   function keepCon () { // keep alive signal
      return _sendWSMessageAndGetResponsePromise('keepCon', {});
   }

   function log () {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Websocket] ');
      console.log.apply(this, args);
   }



   return Services;
});
