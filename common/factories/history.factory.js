app.factory('historyFactory', ['$state', function ($state) {

   var lastState = {
      state: {},
      params: {}
   };

   var beforeLastState = {
      state: {},
      params: {}
   };

   return {
      setLastState: function (fromState, fromParams) {
         lastState = lastState || {};
         beforeLastState = JSON.parse(JSON.stringify(lastState));
         lastState.state = fromState;
         lastState.params = fromParams;
      },
      getLastState: function () {
         return lastState;
      },
      getLastStateName: function () {
         var name = '';
         if (lastState.state.name) name = lastState.state.name;
         return name;
      },
      back: function () {
         // console.log('back', lastState);
         $state.go(lastState.state, lastState.params);
      },
      backTwice: function (alternativeState) {
         // console.log('backTwice', beforeLastState);
         if (beforeLastState.state.name) {
            $state.go(beforeLastState.state, beforeLastState.params);
         } else if (alternativeState) {
            $state.go(alternativeState);
         }
      },
      backToListView: function (alternativeState) {

         // last url includes "new" like /#/production/workingplan/5fad1b2ae12ec133f53ae1b0/new/
         // => that happens after saving a new document in list mode
         // we have to go back twice to return to list view
         var stateIncludesNew = false;
         lastState.params = lastState.params || {};
         for (var key in lastState.params) {
            if (lastState.params[key] === 'new') stateIncludesNew = true;
         }
         if (stateIncludesNew) return this.backTwice(alternativeState);

         // regex check => "list" included in state?
         // fix case: article:edit => article-parents => article:edit => back to list view => article:list
         if (!this.getLastStateName().includes('list') && alternativeState) return $state.go(alternativeState);

         // regular case
         if (this.getLastStateName()) return this.back();

         // on page restart there might be no old state
         if (alternativeState) $state.go(alternativeState);
      }
   };

}]);
