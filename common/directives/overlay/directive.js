/** rf-overlay
 * @desc spinner waiting symbold in a dialog => show the user, that the application is working
 *
 * @example further options
    $scope.$emit('overlay', 'open', 'backupRunning');

    $scope.$emit('overlay', 'close');
 *
 *  @version 0.0.2
 *
 */



app.directive('rfOverlay', ['$timeout', '$rootScope', 'langFactory', function ($timeout, $rootScope, langFactory) {
   return {
      restrict: 'E', // attribute or element
      templateUrl: 'global/common/directives/overlay/template.html',
      scope: true,
      link: function ($scope, elem, attr, ctrl) {
         $scope.visible = false; // init: hide dialog
         // var size;

         $rootScope.$on('overlay', function (event, action, message) {
            if (action === 'open') {
               // show dialog
               $scope.message = langFactory.translate(message);
               $scope.visible = true;
               $timeout(function () {
                  $scope.fade = true;
               }, 40);
            } else if (action === 'close') {
               $scope.fade = false;
               $timeout(function () {
                  $scope.visible = false;
               }, 160);
            }
         });
      }
   };
}]);
