/** meta dialog directive
 * @desc Gloabal dialog box. Can be triggered from anywhere by event.
 * manages animated box and quit function
 *
 * @example simple
 *  //                          type
 * <div class="btn" dialog-open="confirm" dialog-message="dialog text message" dialog-data="scopeObjforDialog" ></div>
 */

app.directive('dialogOpen', ['$rootScope', function ($rootScope) { // save json drawing
   return {
      restrict: 'A', // attribute
      scope: {
         dialogData: '='
      },
      link: function ($scope, elem, attr, ctrl) {
         elem.bind('click', function () {
            $rootScope.$broadcast('dialog', attr.dialogOpen, {
               message: attr.dialogMessage,
               data: $scope.dialogData
            });
         });
      }
   };
}]);
