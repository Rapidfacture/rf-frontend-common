/**
 @example
   $scope.$on('escape', function () {
       console.log('enter key pressed');
   });
   $scope.$on('enter', function () {
       console.log('enter key pressed');
   });
   $scope.$on('tab', function () {
       console.log('enter key pressed');
   });
*/
app.factory('eventFactory', ['$document', '$rootScope', function ($document, $rootScope) {

   var events = {
      escape: 27,
      enter: 13,
      tab: 9
   };

   var keysToListen = []; // all other keys are ignored
   for (var key in events) keysToListen.push(events[key]);

   $document.bind('keydown', function (event) {
      var which = event.which;
      // console.log('event.which', which);
      if (keysToListen.indexOf(which) === -1) return;

      for (var key in events) {
         if (events[key] === which) $rootScope.$broadcast(key);
      }
   });

   return {};
}]);
