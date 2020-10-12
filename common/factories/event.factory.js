app.factory('eventFactory', ['$document', function ($document) {
   $document.bind('keydown', function (event) {
      if (keysToListen.indexOf(event.which) === -1) return;

      for (var k in events) {
         if (events[k].which === event.which) {
            // Filter destroyed scopes
            events[k].functions = events[k].functions.filter(function (f) {
               return ((f.scope && !f.scope.$$destroyed) || !f.scope);
            });

            var selected = events[k].functions[events[k].functions.length - 1];
            selected = selected || {};
            if (selected.fn) selected.fn();

            break;
         }
      }
   });

   var keysToListen = [27];

   var events = {
      escape: {
         functions: [],
         which: 27
      }
   };

   var Services = {
      addEscapeListener: addEscapeListener,
      deleteEscapeListener: deleteEscapeListener
   };

   // scope optional in case there is a scope to determine if it still exists.
   // If destroyed the responding function will be deleted
   function addEscapeListener (fn, scope) {
      events.escape.functions.push({fn: fn, scope: scope});
   }

   function deleteEscapeListener (fn) {
      var index = events.escape.functions.map(function (f) { return f.fn; }).indexOf(fn);

      if (index !== -1) events.escape.functions.splice(index, 1);
   }

   return Services;
}]);
