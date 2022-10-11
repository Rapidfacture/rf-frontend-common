/** dialog with confirm input
 *
 * @version 0.0.5
 * $scope.$emit('dialog', 'confirm-input', {
 *   message: 'removeFile',
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

app.directive('rfDialogConfirmInput', ['langFactory', function (langFactory) {
   return {
      restrict: 'E',
      templateUrl: 'global/common/dialog/confirmInput/template.html',
      scope: { dialog: '=', lang: '=' },
      link: function ($scope, elem, attr, ctrl) {
         $scope.dialog.onSuccess = $scope.dialog.onSuccess || function () {};
         $scope.confirmText = $scope.dialog.confirmText || 'CONFIRM';
         $scope.dialog.message = $scope.dialog.message || langFactory.translate('reallyContinue');
         $scope.warningText = langFactory.translate($scope.dialog.warningText || 'cantBeUndone');
      }
   };
}]);
