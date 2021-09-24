/**
 * @module helperFactory
 * @desc common functions
 * @version 0.1.3
 */

app.factory('helperFactory', ['$state', '$rootScope', function ($state, $rootScope) {

   var Services = {
      watch: _watch,
      saveCheck: _saveCheck,
      twoDecimals: _twoDecimals,
      round: _round,
      moveUpDown: _moveUpDown,
      checkFileVersion: _checkFileVersion,
      parseNumber: _parseNumber,
      accessObjectByString: _accessObjectByString,
      waterfall: _waterfall,
      eachSeries: _eachSeries
   };

   /**
    * @example var saveCheck = new helperFactory.saveCheck($scope, unsaved );
    */
   function _saveCheck (scope) {
      scope.unsaved = false;

      scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams, options) {
         if (scope.unsaved === true) {
            // If changing to child controller or from child to parent, do not ask for saving
            if (toState.parent === fromState.name || fromState.parent === toState.name) {
               $state.go(toState, toParams);
            } else {
               event.preventDefault();
               scope.$emit('modal', 'confirm', 'unsavedChangesReallyLeave', {
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
   function _watch (scope, defaultChangeFunction) {

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

   function _twoDecimals (num) {
      return _round(num, 2);
   }

   function _round (num, dec) {
      if (!dec && dec !== 0) dec = 2;
      var rounded = (Math.round(num + 'e+' + dec) + 'e-' + dec);
      rounded = isNaN(rounded) ? 0 : rounded;
      return parseFloat(rounded);
   }

   // move an item up/down in an array
   function _moveUpDown (arr, index, direction) {
      var copy = arr.slice();
      var toIdx = (direction === 'up') ? index - 1 : index + 1;
      copy.splice(toIdx, 0, copy.splice(index, 1)[0]);
      return copy;
   }

   function _checkFileVersion (filename) {
      // console.log("filename before: ", filename);

      var regex = /[(][0-9][)]$/g;
      var actualVersion = regex.exec(filename); //  "filename (3) (5)" => ["(5)"]
      actualVersion = actualVersion || [''];
      actualVersion = actualVersion[0]; //  ["(5)"] => "(5)"
      filename = filename.replace(actualVersion, ''); //  "filename (3) (5)" => "filename (3) "
      actualVersion = actualVersion.replace('(', '').replace(')', ''); //  "(5)" => "5"
      actualVersion = isNaN(parseInt(actualVersion)) ? 0 : parseInt(actualVersion); //  "5" => 5

      var version = actualVersion + 1;
      filename = filename + '(' + version + ')';
      // console.log("filename afterwards: ", filename);

      return filename;
   }

   function _parseNumber (num) {
      return isNaN(num) ? 0 : parseFloat(num);
   }

   /**
    * @example helperFactory.accessObjectByString({a: {b: 1}, c: 15}, 'a.b'); => 1
    */
   function _accessObjectByString (obj, keyString) {
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

   // _checkFileVersion("filename");
   // _checkFileVersion("filename (3) (5)");
   // _checkFileVersion("filename (7)");
   // _checkFileVersion("filename(2)");
   // _checkFileVersion("filename (sd6) (5s)");
   // _checkFileVersion("filename (ds)");

   // async functions
   function _waterfall (tasks, mainCallback) {
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
      }
   }

   function _eachSeries (items, eachCallback, mainCallback) {
      var i = 0;
      function processNext (err) {
         if (err) return mainCallback(err);
         i++;
         var nextItem = items[i];
         if (nextItem) {
            eachCallback(nextItem, processNext);

         } else { // last run
            mainCallback();
         }
      }

      // start the process
      if (Array.isArray(items) && items.length) {
         eachCallback(items[i], processNext);

      } else {
         console.log('empty tasklist or invalid tasks ', items);
      }
   }

   return Services;
}]);
