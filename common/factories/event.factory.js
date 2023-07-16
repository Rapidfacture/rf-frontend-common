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
app.factory('eventFactory', function ($document, $rootScope) {

   var events = {
      delete: 46,
      escape: 27,
      ctrl: 17,
      enter: 13,
      tab: 9
   };

   var keysToListen = []; // all other keys are ignored
   for (var key in events) keysToListen.push(events[key]);

   $document.bind('keydown', function (event) {
      broadcast(event);
   });

   $document.bind('keyup', function (event) {
      broadcast(event, 'keyup-');
   });

   function broadcast (event, prefix) {
      prefix = prefix || '';
      var which = event.which;
      // console.log('event.which', which);
      if (keysToListen.indexOf(which) === -1) return;

      for (var key in events) {
         var msg = prefix + key;
         if (events[key] === which) $rootScope.$broadcast(msg);
      }
   }

   return {};
});
