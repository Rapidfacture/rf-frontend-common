/**
 * @module helperFactory
 * @desc common functions
 * @version 0.1.8carefulMerge
 */

app.factory('helperFactory', ['$state', '$rootScope', function ($state, $rootScope) {

   var Services = {
      watch: watch,
      saveCheck: saveCheck,
      twoDecimals: twoDecimals,
      round: round,
      moveUpDown: moveUpDown,
      parseNumber: parseNumber,
      accessObjectByString: accessObjectByString,
      waterfall: waterfall,
      eachSeries: eachSeries,
      elemOutsideClickListener: elemOutsideClickListener,
      createLazySave: createLazySave,
      createLazySaveMulti: createLazySaveMulti,
      carefulMerge: carefulMerge
   };

   /**
    * @example var saveCheck = new helperFactory.saveCheck($scope, unsaved );
    */
   function saveCheck (scope) {
      scope.unsaved = false;

      scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams, options) {
         if (scope.unsaved === true) {
            // If changing to child controller or from child to parent, do not ask for saving
            if (toState.parent === fromState.name || fromState.parent === toState.name) {
               $state.go(toState, toParams);
            } else {
               event.preventDefault();
               scope.$emit('dialog', 'confirm', {
                  message: 'unsavedChangesReallyLeave',
                  onSuccess: function () {
                     scope.unsaved = false;
                     $state.go(toState, toParams);
                  }
               });
            }
         }
      });
   }

   /**
    * @example
    *
    * var watch = new helperFactory.watcher($scope, onChangeFunction );
    * watch.addWatcher('customer');
    * watch.addWatcher('order')
    *
    * watch.startAll();
    * watch.stopAll();
    *
    */
   function watch (scope, defaultChangeFunction) {

      var self = this;
      self.list = {};
      self.scope = scope;

      self.watchChange = defaultChangeFunction || function (newVal, oldVal) {
         if (newVal !== oldVal) scope.unsaved = true; // tell user, he has to save
      };

      // create a watcher in list
      self.addWatcher = function (scopeObjectToWatch, changeFunction) {
         changeFunction = changeFunction || self.watchChange;
         self.list[scopeObjectToWatch] = {
            process: scope.$watch(scopeObjectToWatch, changeFunction, true),
            changeFunction: changeFunction
         };
      };

      // main functions: start and stop all watchers
      self.startAll = function () {
         for (var watchName in self.list) {
            self.start(watchName);
         }
      };
      self.stopAll = function () {
         for (var watchName in self.list) {
            self.stop(watchName);
         }
      };

      // delete a watchers
      self.unbind = function (name) {
         self.stop(name);
         delete self.list[name];
      };
      self.unbindAll = function () {
         for (var watchName in self.list) {
            self.unbind(watchName);
         }
      };

      // start/stop a single watcher
      self.start = function (name) {
         if (self.list[name] && self.list[name].process === false) {
            self.list[name].process = scope.$watch(name, self.list[name].changeFunction, true);
         }
      };
      self.stop = function (name) {
         if (self.list[name] && self.list[name].process !== false) {
            self.list[name].process();
            self.list[name].process = false;
         }
      };
   }

   function twoDecimals (num) {
      return round(num, 2);
   }

   function round (num, dec) {
      if (!dec && dec !== 0) dec = 2;
      var rounded = (Math.round(num + 'e+' + dec) + 'e-' + dec);
      rounded = isNaN(rounded) ? 0 : rounded;
      return parseFloat(rounded);
   }

   // move an item up/down in an array
   function moveUpDown (arr, index, direction) {
      var copy = arr.slice();
      var toIdx = (direction === 'up') ? index - 1 : index + 1;
      copy.splice(toIdx, 0, copy.splice(index, 1)[0]);
      return copy;
   }

   function parseNumber (num) {
      return isNaN(num) ? 0 : parseFloat(num);
   }

   /**
    * @example helperFactory.accessObjectByString({a: {b: 1}, c: 15}, 'a.b'); => 1
    */
   function accessObjectByString (obj, keyString) {
      keyString = keyString.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
      keyString = keyString.replace(/^\./, ''); // strip a leading dot
      var a = keyString.split('.');
      for (var i = 0, n = a.length; i < n; ++i) {
         var k = a[i];
         if (k in obj) {
            obj = obj[k];
         } else {
            return;
         }
      }
      return obj;
   }

   // async functions
   function waterfall (tasks, mainCallback) {
      var i = 0;

      function callback () {
         var err = null;

         // prepare function arguments
         var args = Array.prototype.slice.call(arguments);
         if (args.length > 0) err = args.shift(); // remove 'err' from arguments and set error variable
         args.push(callback); // add 'callback'

         // on error: stop and tell the user
         if (err) {
            $rootScope.$emit('note_error', 'Error at function ' + tasks[i].name + ': ' + err);
            // console.log(tasks[i].name);
            // console.log(err);
            mainCallback(err);

         // process
         } else {
            i++;
            var nextTask = tasks[i];

            // process
            if (typeof nextTask === 'function') {
               // console.log(i, nextTask, args);

               nextTask.apply(null, args);

            // last run => success
            } else {
               mainCallback(err, args);
            }
         }
      }

      // start the process
      if (typeof tasks !== 'string' && tasks[0]) {
         tasks[0](callback);
      } else {
         console.log('empty tasklist or invalid tasks ', tasks);
         mainCallback();
      }
   }

   function eachSeries (items, eachCallback, mainCallback) {
      var i = 0;
      function processNext (err) {
         if (err) return mainCallback(err);
         i++;
         var nextItem = items[i];
         if (nextItem) {
            eachCallback(nextItem, processNext, i);

         } else { // last run
            mainCallback();
         }
      }

      // start the process
      if (Array.isArray(items) && items.length) {
         eachCallback(items[i], processNext, i);

      } else {
         console.log('function eachSeries: empty array ', items);
         mainCallback();
      }
   }



   function elemOutsideClickListener (element, outsideClickFunc, insideClickFunc) {
      function onClickOutside (e) {
         var targetEl = e.target; // clicked element
         do {
            // click inside
            if (targetEl === element) {
               if (insideClickFunc) insideClickFunc();
               return;

            // Go up the DOM
            } else {
               targetEl = targetEl.parentNode;
            }
         } while (targetEl);

         // click outside
         if (!targetEl && outsideClickFunc) outsideClickFunc();
      }

      window.addEventListener('click', onClickOutside);

      return function () {
         window.removeEventListener('click', onClickOutside);
      };
   }


   /** createLazySave: save only once with a delay, prevent jitter
    *
    * var lazySave = helperFactory.createLazySave({defaultTimeout: 1500});
    *
    * function toggleCheckBox (num) {
    *    lazySave(function () {
    *       // will be executed only after last call
    *       if ($scope.ngChange) $scope.ngChange(num);
    *    });
    * }
    */

   function createLazySave (opts) {
      opts = Object.assign({
         defaultTimeout: 600,
         countingInterval: 100
      }, (opts || {}));
      var saveRunning = false;
      var waitingTime = opts.defaultTimeout;

      return function lazySave (saveFunction) {
         if (saveRunning) {
            if (waitingTime < 2 * opts.defaultTimeout) waitingTime += opts.defaultTimeout;
         } else {
            saveRunning = true;
            countDown(opts.countingInterval, waitingTime, function () {
               saveRunning = false;
               waitingTime = opts.defaultTimeout;
               if (saveFunction) saveFunction();
            });
         }
      };
   }

   function countDown (countingInterval, waitingTime, callback) {
      if (waitingTime > 0) {
         setTimeout(function () {
            waitingTime = waitingTime - countingInterval;
            countDown(countingInterval, waitingTime, callback);
         }, countingInterval);
      } else {
         if (callback) callback();
      }
   }

   function createLazySaveMulti (opts) {
      opts = Object.assign({
         defaultTimeout: 600,
         countingInterval: 100
      }, (opts || {}));
      var waitingTime = opts.defaultTimeout;
      var saveRunningList = [];

      return function controlLazySave (id, saveFunction) {
         if (!saveRunningList.includes(id)) {
            saveRunningList.push(id);
            lazySave(saveFunction);
         }

         function lazySave (saveFunction) {
            countDown(opts.countingInterval, waitingTime, function () {
               waitingTime = opts.defaultTimeout;
               if (saveFunction) {
                  saveFunction();
                  saveRunningList = saveRunningList.filter(function (pushedId) { return pushedId !== id; });
               };
            });
         }
      };
   }

   /** carefulMerge: similar to Object.assign, but deep copy a special key path
    * allowe to carfully write data from the backend after saving back to the frontend
    * "jumping" in the view through ng-repeats is prevented
    *
    * helperFactory.carefulMerge($scope.campaign, result, 'customerList.list');
    *
    */
   function carefulMerge (oldObj, updateObj, key) {
      // prevent frontend refresh problems as we can update a subsection of the data one by one
      // this prevents the ng-repeat from "jumping"
      var keys = key.split('.');

      transferKeys(oldObj, updateObj, 0);

      function transferKeys (oldObj, updateObj, index) {
         if (Array.isArray(updateObj)) {
            for (var i = 0; i < updateObj.length; i++) {
               oldObj[i] = oldObj[i] || {};
               Object.assign(oldObj[i], updateObj[i]);
            }

            // some items were deleted? shorten the array
            var newLength = updateObj.length;
            while (newLength < oldObj.length) oldObj.pop();

            // abort here
         } else if (typeof updateObj === 'object') {
            var ignoreKey = keys[index];
            index++;
            for (var key in updateObj) {
               // update all, except what we should ignore
               if (key !== ignoreKey) oldObj[key] = updateObj[key];
            }

            // step in next lower level, if there is one
            if (ignoreKey) transferKeys(oldObj[ignoreKey], updateObj[ignoreKey], index);
         } // else: abort
      }
   }

   return Services;
}]);
