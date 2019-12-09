/** modal with confirm input
 *
 * @version 0.0.5
 * $scope.$emit('modal', 'confirm-input', 'removeFile', {
 *   warningText: 'thisRequiresRestartingWhichWillTerminateRunningTransactionsContinue',
 *   confirmText: 'restart',
 *   onSuccess: function () {
 *      $scope.save(function () {
 *
 *       });
 *    },
 *    onFailure: function () {}
 * });
*/

app.directive('rfModalConfirmInput', ['langfactory', function (langfactory) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/modal/confirmInput/template.html',
      scope: { modal: '=', lang: '=' },
      link: function ($scope, elem, attr, ctrl) {
         $scope.modal.onSuccess = $scope.modal.onSuccess || function () {};
         $scope.confirmText = $scope.modal.confirmText || 'CONFIRM';
         $scope.warningText = langfactory.translate($scope.modal.warningText || 'cantBeUndone');
      }
   };
}]);
