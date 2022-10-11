/** meta dialog directive
 * @desc Gloabal dialog box. Can be triggered from anywhere by event.
 * manages animated box and quit function
 *
 * @example simple
 *  //                          type
 * <div class="btn" modal-open="confirm" modal-message="dialog text message" modal-data="scopeObjforModal" ></div>
 */

app.directive('modalOpen', ['$rootScope', function ($rootScope) { // save json drawing
   return {
      restrict: 'A', // attribute
      scope: {
         modalData: '='
      },
      link: function ($scope, elem, attr, ctrl) {
         elem.bind('click', function () {
            $rootScope.$broadcast('modal', attr.modalOpen, {
               message: attr.modalMessage,
               data: $scope.modalData
            });
         });
      }
   };
}]);
